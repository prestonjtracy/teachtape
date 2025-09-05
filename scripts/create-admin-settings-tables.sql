-- Create admin settings and audit logs tables
-- This enables feature toggles and tracks all admin actions

-- ==========================================
-- ADMIN SETTINGS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  setting_type text CHECK (setting_type IN ('boolean', 'string', 'number', 'json')) NOT NULL DEFAULT 'boolean',
  display_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_public boolean DEFAULT false, -- Whether this setting can be accessed by non-admin users
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value, setting_type, display_name, description, category, is_public) VALUES
  ('bookings_enabled', 'true', 'boolean', 'Enable Bookings', 'Allow users to create and manage bookings', 'features', true),
  ('chat_enabled', 'true', 'boolean', 'Enable Chat', 'Allow messaging between coaches and athletes', 'features', true),
  ('maintenance_mode', 'false', 'boolean', 'Maintenance Mode', 'Put the site in maintenance mode (only admins can access)', 'system', true),
  ('new_user_registration', 'true', 'boolean', 'New User Registration', 'Allow new users to create accounts', 'features', true),
  ('coach_verification_required', 'true', 'boolean', 'Coach Verification Required', 'Require admin verification before coaches can accept bookings', 'features', false),
  ('platform_fee_percentage', '10', 'number', 'Platform Fee Percentage', 'Percentage fee taken from each booking', 'payments', false),
  ('minimum_booking_amount', '1000', 'number', 'Minimum Booking Amount (cents)', 'Minimum amount for a booking in cents', 'payments', false),
  ('support_email', '"support@teachtape.com"', 'string', 'Support Email', 'Primary support contact email', 'contact', true),
  ('site_announcement', '""', 'string', 'Site Announcement', 'Banner message shown to all users', 'general', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- AUDIT LOGS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  target_type text, -- 'user', 'coach', 'listing', 'booking', 'payment', 'setting', etc.
  target_id text, -- ID of the affected entity
  target_identifier text, -- Human-readable identifier (email, name, etc.)
  details jsonb, -- Additional context about the action
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS admin_settings_category_idx ON public.admin_settings(category);
CREATE INDEX IF NOT EXISTS admin_settings_is_public_idx ON public.admin_settings(is_public);
CREATE INDEX IF NOT EXISTS admin_settings_setting_key_idx ON public.admin_settings(setting_key);

CREATE INDEX IF NOT EXISTS audit_logs_admin_id_idx ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_target_type_idx ON public.audit_logs(target_type);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only for both tables
CREATE POLICY "admin_settings_full_access" 
ON public.admin_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_audit_logs_read_access" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  )
);

-- Public settings access for non-admin users
CREATE POLICY "public_settings_read_access" 
ON public.admin_settings 
FOR SELECT 
USING (is_public = true);

-- Function to update updated_at timestamp for settings
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER admin_settings_updated_at_trigger
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_admin_settings_updated_at();

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_email text,
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_target_identifier text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
  admin_profile_id uuid;
BEGIN
  -- Get admin profile ID
  SELECT id INTO admin_profile_id
  FROM public.profiles p
  JOIN auth.users u ON p.auth_user_id = u.id
  WHERE u.email = p_admin_email AND p.role = 'admin'
  LIMIT 1;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    admin_id,
    admin_email,
    action,
    target_type,
    target_id,
    target_identifier,
    details,
    ip_address,
    user_agent
  ) VALUES (
    admin_profile_id,
    p_admin_email,
    p_action,
    p_target_type,
    p_target_id,
    p_target_identifier,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;