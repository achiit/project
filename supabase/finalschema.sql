CREATE TABLE diagnostic_centers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    plot_floor_street TEXT,
    city TEXT,
    district TEXT,
    state TEXT,
    pin TEXT,
    phone_number TEXT,
    registration_number TEXT
);

CREATE TABLE performing_doctors (
    id UUID PRIMARY KEY,
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id),
    name TEXT NOT NULL,
    qualifications TEXT,
    registration_number TEXT,
    contact_info TEXT
);

CREATE TABLE referring_doctors (
    id UUID PRIMARY KEY,
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id),
    name TEXT NOT NULL,
    hospital_name TEXT,
    hospital_address TEXT,
    registration_number TEXT,
    contact_info TEXT
);

CREATE TABLE pregnant_woman (
    id UUID PRIMARY KEY,
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id),
    name TEXT NOT NULL,
    age INT,
    husband_name TEXT,
    father_name TEXT,
    present_address TEXT,
    aadhaar_card_address TEXT,
    contact_number TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aadhaar_number VARCHAR(12) UNIQUE
);

CREATE TABLE pregnancy_details (
    id UUID PRIMARY KEY,
    pregnant_woman_id UUID REFERENCES pregnant_woman(id),
    number_of_children INT,
    last_menstrual_period DATE
);

CREATE TABLE children (
    id UUID PRIMARY KEY,
    pregnancy_details_id UUID REFERENCES pregnancy_details(id),
    gender TEXT,
    age_in_years INT
);

CREATE TABLE scans (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE procedures (
    id UUID PRIMARY KEY,
    pregnant_woman_id UUID REFERENCES pregnant_woman(id),
    procedure_date DATE,
    attending_doctor_id UUID REFERENCES performing_doctors(id),
    referring_doctor_id UUID REFERENCES referring_doctors(id),
    scan_performed UUID REFERENCES scans(id)
);

CREATE TABLE indication_types (
    id UUID PRIMARY KEY,
    indication TEXT NOT NULL
);

CREATE TABLE procedure_indications (
    id UUID PRIMARY KEY,
    procedure_id UUID REFERENCES procedures(id),
    indication_types_id UUID REFERENCES indication_types(id)
);

CREATE TABLE consent (
    id UUID PRIMARY KEY,
    pregnant_woman_id UUID REFERENCES pregnant_woman(id),
    mobile_number TEXT,
    otp_verified BOOLEAN,
    verification_details BOOLEAN,
    his_aadhar_registered BOOLEAN,
    relative_name TEXT,
    relationship_to_patient TEXT,
    relative_contact_number VARCHAR
);

CREATE TABLE patient_center_associations (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES pregnant_woman(id),
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id),
    is_primary_center BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
