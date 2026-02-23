-- Medical Drugs Distribution App - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  military_id INTEGER NOT NULL UNIQUE CHECK (military_id >= 1000000 AND military_id <= 9999999),
  full_name TEXT NOT NULL,
  rank TEXT NOT NULL CHECK (rank IN (
    'Rabat','Samal','Samar','Rasal','Rasar','Rasam','Rasab','Ranag',
    'Sagam','Segen','Seren','Rasan','Sa''al','Alam','Ta''al','Aluf','Ra''al',
    'Kama','Ka''ab','Ka''am'
  )),
  job TEXT NOT NULL CHECK (job IN ('Doctor','Paramedic','Medic','Logistical','Other')),
  phone_number TEXT NOT NULL,
  system_role TEXT NOT NULL DEFAULT 'General' CHECK (system_role IN ('General','Admin','Temp_Admin')),
  email TEXT,
  role_expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory batches table
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_category TEXT NOT NULL CHECK (drug_category IN ('Actiq','Other')),
  amount_received INTEGER NOT NULL DEFAULT 0,
  date_received DATE NOT NULL,
  receiving_admin_id UUID NOT NULL REFERENCES users(id),
  lot_number TEXT,
  expiration_date DATE,
  other_drugs_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active assignments table
CREATE TABLE IF NOT EXISTS active_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  soldier_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  actiq_balance INTEGER NOT NULL DEFAULT 0,
  other_drugs_text TEXT,
  last_assigned_date TIMESTAMPTZ DEFAULT NOW(),
  last_assigned_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action logs table (immutable audit trail)
CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL CHECK (action_type IN ('Given','Administered','Returned','Lost/Damaged')),
  actiq_amount INTEGER NOT NULL DEFAULT 0,
  other_drugs_text TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  admin_id UUID NOT NULL REFERENCES users(id),
  soldier_id UUID NOT NULL REFERENCES users(id),
  signature_image_url TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_military_id ON users(military_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_system_role ON users(system_role);
CREATE INDEX IF NOT EXISTS idx_active_assignments_soldier ON active_assignments(soldier_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_timestamp ON action_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_soldier ON action_logs(soldier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_category ON inventory_batches(drug_category);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON inventory_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON active_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON action_logs FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete (admin checks in app layer)
CREATE POLICY "Allow authenticated insert" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON users FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON users FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON inventory_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON active_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON active_assignments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON active_assignments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON action_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_assignments_updated_at BEFORE UPDATE ON active_assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'signatures');
