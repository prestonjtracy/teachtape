-- Prevent booking requests from being changed from 'accepted' to 'declined'
-- Once a request is accepted and payment is processed, it should not be declined

-- Create a trigger function to prevent invalid status transitions
CREATE OR REPLACE FUNCTION prevent_invalid_booking_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing from 'accepted' to 'declined'
  -- Payment has already been processed at this point
  IF OLD.status = 'accepted' AND NEW.status = 'declined' THEN
    RAISE EXCEPTION 'Cannot decline a booking request that has already been accepted and paid';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the constraint
DROP TRIGGER IF EXISTS check_booking_request_status_transition ON booking_requests;

CREATE TRIGGER check_booking_request_status_transition
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invalid_booking_request_status_change();
