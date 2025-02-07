/*
  # Initial Schema Setup for Diagnostic Center Platform

  1. Tables Created
    - diagnostic_centers
    - performing_doctors
    - referring_doctors
    - pregnant_women
    - pregnancy_details
    - children
    - procedures
    - indication_types
    - procedure_indications
    - consent

  2. Security
    - RLS enabled on all tables
    - Policies set up for authenticated access
*/

-- Diagnostic Centers
CREATE TABLE diagnostic_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plot_floor_street TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    pin INTEGER NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    registration_number TEXT NOT NULL UNIQUE
);

ALTER TABLE diagnostic_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can view own data"
    ON diagnostic_centers
    FOR SELECT
    USING (auth.uid() = id);

-- Performing Doctors
CREATE TABLE performing_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id),
    name TEXT NOT NULL,
    qualifications TEXT NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    contact_info TEXT NOT NULL
);

ALTER TABLE performing_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage their doctors"
    ON performing_doctors
    FOR ALL
    USING (diagnostic_center_id IN (
        SELECT id FROM diagnostic_centers 
        WHERE auth.uid() = diagnostic_centers.id
    ));

-- Referring Doctors
CREATE TABLE referring_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id),
    name TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    hospital_address TEXT NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    contact_info TEXT NOT NULL
);

ALTER TABLE referring_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage their referring doctors"
    ON referring_doctors
    FOR ALL
    USING (diagnostic_center_id IN (
        SELECT id FROM diagnostic_centers 
        WHERE auth.uid() = diagnostic_centers.id
    ));

-- Pregnant Women
CREATE TABLE pregnant_women (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id),
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    husband_name TEXT,
    father_name TEXT,
    present_address TEXT NOT NULL,
    aadhar_card_address TEXT,
    contact_number TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pregnant_women ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage their patients"
    ON pregnant_women
    FOR ALL
    USING (diagnostic_center_id IN (
        SELECT id FROM diagnostic_centers 
        WHERE auth.uid() = diagnostic_centers.id
    ));

-- Pregnancy Details
CREATE TABLE pregnancy_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnant_woman_id UUID REFERENCES pregnant_women(id),
    number_of_children_alive INTEGER DEFAULT 0,
    last_menstrual_period DATE NOT NULL
);

-- Create a view for pregnancy details with calculated gestation period
CREATE VIEW pregnancy_details_with_gestation AS
SELECT 
    pd.*,
    (CURRENT_DATE - last_menstrual_period) / 7 AS period_of_gestation_weeks,
    (CURRENT_DATE - last_menstrual_period) % 7 AS period_of_gestation_days
FROM pregnancy_details pd;

ALTER TABLE pregnancy_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage pregnancy details"
    ON pregnancy_details
    FOR ALL
    USING (pregnant_woman_id IN (
        SELECT id FROM pregnant_women 
        WHERE diagnostic_center_id IN (
            SELECT id FROM diagnostic_centers 
            WHERE auth.uid() = diagnostic_centers.id
        )
    ));

-- Children
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnancy_details_id UUID REFERENCES pregnancy_details(id),
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    age_in_years INTEGER
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage children details"
    ON children
    FOR ALL
    USING (pregnancy_details_id IN (
        SELECT id FROM pregnancy_details 
        WHERE pregnant_woman_id IN (
            SELECT id FROM pregnant_women 
            WHERE diagnostic_center_id IN (
                SELECT id FROM diagnostic_centers 
                WHERE auth.uid() = diagnostic_centers.id
            )
        )
    ));

-- Procedures
CREATE TABLE procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnant_woman_id UUID REFERENCES pregnant_women(id),
    procedure_date DATE DEFAULT CURRENT_DATE,
    attending_doctor_id UUID REFERENCES performing_doctors(id)
);

ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage procedures"
    ON procedures
    FOR ALL
    USING (pregnant_woman_id IN (
        SELECT id FROM pregnant_women 
        WHERE diagnostic_center_id IN (
            SELECT id FROM diagnostic_centers 
            WHERE auth.uid() = diagnostic_centers.id
        )
    ));

-- Indication Types
CREATE TABLE indication_types (
    id SERIAL PRIMARY KEY,
    indication TEXT NOT NULL UNIQUE
);

ALTER TABLE indication_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read indications"
    ON indication_types
    FOR SELECT
    TO authenticated
    USING (true);

-- Procedure Indications
CREATE TABLE procedure_indications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID REFERENCES procedures(id),
    indication_type_id INTEGER REFERENCES indication_types(id)
);

ALTER TABLE procedure_indications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage procedure indications"
    ON procedure_indications
    FOR ALL
    USING (procedure_id IN (
        SELECT id FROM procedures 
        WHERE pregnant_woman_id IN (
            SELECT id FROM pregnant_women 
            WHERE diagnostic_center_id IN (
                SELECT id FROM diagnostic_centers 
                WHERE auth.uid() = diagnostic_centers.id
            )
        )
    ));

-- Consent
CREATE TABLE consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregnant_woman_id UUID REFERENCES pregnant_women(id),
    mobile_number TEXT NOT NULL,
    otp_verified BOOLEAN DEFAULT FALSE,
    verification_details TEXT
);

ALTER TABLE consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can manage consent"
    ON consent
    FOR ALL
    USING (pregnant_woman_id IN (
        SELECT id FROM pregnant_women 
        WHERE diagnostic_center_id IN (
            SELECT id FROM diagnostic_centers 
            WHERE auth.uid() = diagnostic_centers.id
        )
    ));

-- Insert default indication types
INSERT INTO indication_types (indication) VALUES
    ('To diagnose intra-uterine and/or ectopic pregnancy and confirm viability'),
    ('Estimation of gestational age (dating)'),
    ('Detection of number of fetuses and their chorionicity'),
    ('Suspected pregnancy with IUCD in-situ or suspected pregnancy following contraceptive failure/MTP failure'),
    ('Vaginal bleeding / leaking'),
    ('Follow-up of cases of abortion'),
    ('Assessment of cervical canal and diameter of internal os'),
    ('Discrepancy between uterine size and period of amenorrhoea'),
    ('Any suspected adenexal or uterine pathology / abnormality'),
    ('Detection of chromosomal abnormalities, foetal structural defects and other abnormalities and their follow-up'),
    ('To evaluate foetal presentation and position'),
    ('Assessment of liquor amnii'),
    ('Preterm labour / preterm premature rupture of membranes'),
    ('Evaluation of placental position, thickness, grading and abnormalities'),
    ('Evaluation of umbilical cord'),
    ('Evaluation of previous Caesarean Section scars'),
    ('Evaluation of foetal growth parameters'),
    ('Colour flow mapping and duplex Doppler studies'),
    ('Ultrasound guided procedures'),
    ('Adjunct to diagnostic and therapeutic invasive interventions'),
    ('Observation of intra-partum events'),
    ('Medical/surgical conditions complicating pregnancy'),
    ('Research/scientific studies in recognized institutions');