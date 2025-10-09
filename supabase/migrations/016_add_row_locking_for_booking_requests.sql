-- Add PostgreSQL row-level locking to prevent race conditions when accepting/declining booking requests

-- Function to atomically update booking request status with row locking
CREATE OR REPLACE FUNCTION update_booking_request_status_atomic(
  request_id uuid,
  expected_current_status text,
  new_status text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_status text;
  result jsonb;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT status INTO current_status
  FROM booking_requests
  WHERE id = request_id
  FOR UPDATE;

  -- If row doesn't exist
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Booking request not found'
    );
  END IF;

  -- Check if current status matches expected status
  IF current_status != expected_current_status THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'status_mismatch',
      'message', format('Expected status %s but found %s', expected_current_status, current_status),
      'current_status', current_status
    );
  END IF;

  -- Update the status
  UPDATE booking_requests
  SET status = new_status, updated_at = now()
  WHERE id = request_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_status', current_status,
    'new_status', new_status
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_booking_request_status_atomic(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_booking_request_status_atomic(uuid, text, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION update_booking_request_status_atomic IS 'Atomically update booking request status with row-level locking to prevent race conditions';
