-- Add referring_doctor_id to procedures table
ALTER TABLE procedures
ADD COLUMN referring_doctor_id UUID REFERENCES referring_doctors(id);

-- Update consent table with additional fields
ALTER TABLE consent
ADD COLUMN aadhar_number VARCHAR(12),
ADD COLUMN has_aadhar_registered_mobile BOOLEAN,
ADD COLUMN relative_name TEXT,
ADD COLUMN relationship_to_patient VARCHAR(50),
ADD COLUMN relative_contact_number VARCHAR(10);

-- Create scans table
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert constant data into scans table
INSERT INTO scans (name, description) VALUES
('Early pregnancy scan'),
('Level-I / NB-NT scan'),
('Level-II / Anomaly scan'),
('Growth scan'),
('Fetal well being'),
('Biophysical Profile/score (BPP/BPS)'),
('Growth scan & Doppler'),
('Growth scan & BPP'),
('Growth scan, BPP & Doppler'),
('Amniotic fluid volume estimation'),
('Whole abodmen'),
('Upper abdomen'),
('KUB'),
('Pelvis / Lower abdomen');