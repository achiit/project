import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, Plus, Minus, Check, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";
import Header from "../components/Header";

interface ChildFormData {
  gender: "Male" | "Female" | "Other";
  ageInYears: number;
}

interface PerformingDoctor {
  id: string;
  name: string;
  qualifications: string;
}

interface ReferringDoctor {
  id: string;
  name: string;
  hospital_name: string;
}

interface IndicationType {
  id: number;
  indication: string;
}

interface NewPerformingDoctor {
  name: string;
  qualifications: string;
  registrationNumber: string;
  contactInfo: string;
}

interface NewReferringDoctor {
  name: string;
  hospitalName: string;
  hospitalAddress: string;
  registrationNumber: string;
  contactInfo: string;
}

interface PatientFormData {
  // Step 1: Basic Information
  aadharNumber: string; // Moved to first step
  name: string;
  age: number;
  husbandName: string;
  fatherName: string;
  presentAddress: string;
  aadharCardAddress: string;
  contactNumber: string;

  // Pregnancy Details
  lastMenstrualPeriod: string;
  numberOfChildrenAlive: number;
  children: ChildFormData[];

  // Procedure Details
  performingDoctorId: string;
  referringDoctorId: string;
  selectedIndications: number[];
  procedureDate: string;

  // Modified Consent fields
  hasAadharRegisteredMobile: boolean;
  consentMobile: string;
  consentOtp: string;
  relativeName?: string;
  relationshipToPatient?: string;

  // New fields
  scanPerformed: string;
}

export default function AddPatient() {
  const navigate = useNavigate();
  const { diagnosticCenter } = useAuth();
  const [step, setStep] = useState(1);
  const [performingDoctors, setPerformingDoctors] = useState<
    PerformingDoctor[]
  >([]);
  const [referringDoctors, setReferringDoctors] = useState<ReferringDoctor[]>(
    []
  );
  const [indicationTypes, setIndicationTypes] = useState<IndicationType[]>([]);
  const [showConsentOtp, setShowConsentOtp] = useState(false);
  const [consentVerified, setConsentVerified] = useState(false);
  const [showNewPerformingDoctor, setShowNewPerformingDoctor] = useState(false);
  const [showNewReferringDoctor, setShowNewReferringDoctor] = useState(false);
  const [newPerformingDoctors, setNewPerformingDoctors] = useState<
    NewPerformingDoctor[]
  >([]);
  const [newReferringDoctors, setNewReferringDoctors] = useState<
    NewReferringDoctor[]
  >([]);
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);
  const [doctorSubmissionError, setDoctorSubmissionError] = useState("");
  const [scans, setScans] = useState([]);
  const [aadharError, setAadharError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm<PatientFormData>({
    defaultValues: {
      age: 18,
      numberOfChildrenAlive: 0,
      children: [],
      selectedIndications: [],
      procedureDate: new Date().toISOString().split("T")[0],
      hasAadharRegisteredMobile: undefined, // Initialize as undefined
    },
  });

  const numberOfChildrenAlive = watch("numberOfChildrenAlive");

  useEffect(() => {
    fetchDoctors();
    fetchIndicationTypes();
    fetchReferringDoctors();
    fetchScans();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data: performingData, error: performingError } = await supabase
        .from("performing_doctors")
        .select("id, name, qualifications")
        .eq("diagnostic_center_id", diagnosticCenter.id);

      if (performingError) throw performingError;
      setPerformingDoctors(performingData || []);

      const { data: referringData, error: referringError } = await supabase
        .from("referring_doctors")
        .select("id, name, hospital_name")
        .eq("diagnostic_center_id", diagnosticCenter.id);

      if (referringError) throw referringError;
      setReferringDoctors(referringData || []);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const fetchIndicationTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("indication_types")
        .select("*")
        .order("id");

      if (error) throw error;
      setIndicationTypes(data || []);
    } catch (err) {
      console.error("Error fetching indication types:", err);
    }
  };

  const fetchReferringDoctors = async () => {
    const { data, error } = await supabase
      .from("referring_doctors")
      .select("*");
    if (error) console.error("Error fetching referring doctors:", error);
    else setReferringDoctors(data);
  };

  const fetchScans = async () => {
    const { data, error } = await supabase.from("scans").select("*");
    if (error) console.error("Error fetching scans:", error);
    else setScans(data);
  };

  const validatePhoneNumber = (value: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return (
      phoneRegex.test(value) || "Please enter a valid 10-digit mobile number"
    );
  };

  const validateLMP = (value: string) => {
    const lmpDate = new Date(value);
    const today = new Date();
    const minDate = new Date();
    minDate.setMonth(today.getMonth() - 9);

    if (lmpDate > today) {
      return "LMP date cannot be in the future";
    }
    if (lmpDate < minDate) {
      return "LMP date cannot be more than 9 months ago";
    }
    return true;
  };

  const addChild = () => {
    const currentChildren = watch("children") || [];
    setValue("children", [
      ...currentChildren,
      { gender: "Male", ageInYears: 0 },
    ]);
  };

  const removeChild = (index: number) => {
    const currentChildren = watch("children") || [];
    setValue(
      "children",
      currentChildren.filter((_, i) => i !== index)
    );
  };

  const handleSendConsentOtp = async () => {
    const consentMobile = watch("consentMobile");
    if (!validatePhoneNumber(consentMobile)) {
      setError("consentMobile", {
        type: "manual",
        message: "Please enter a valid mobile number",
      });
      return;
    }
    setShowConsentOtp(true);
    // TODO: Implement actual OTP sending logic
  };

  const handleVerifyConsentOtp = async () => {
    const consentOtp = watch("consentOtp");
    if (consentOtp === "123456") {
      setConsentVerified(true);
    } else {
      setError("consentOtp", {
        type: "manual",
        message: "Invalid OTP",
      });
    }
  };

  const validateAadharNumber = async (value: string) => {
    if (!/^\d{12}$/.test(value)) {
      return "Please enter a valid 12-digit Aadhar number";
    }

    // Check if Aadhar already exists
    const { data } = await supabase
      .from("pregnant_women")
      .select("id")
      .eq("aadhar_number", value)
      .single();
    console.log(data);
    if (data) {
      setAadharError("This Aadhar number is already registered");

      return "This Aadhar number is already registered";
    }

    return true;
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      setAadharError(null); // Reset any previous errors
  
      if (!consentVerified) {
        setError("consentOtp", {
          type: "manual",
          message: "Please verify consent OTP before proceeding",
        });
        return;
      }

      // 1. Insert patient data with Aadhar
      const { data: patientData, error: patientError } = await supabase
        .from("pregnant_women")
        .insert({
          diagnostic_center_id: diagnosticCenter.id,
          aadhar_number: data.aadharNumber,
          name: data.name.trim(),
          age: data.age,
          husband_name: data.husbandName?.trim() || null,
          father_name: data.fatherName?.trim() || null,
          present_address: data.presentAddress.trim(),
          aadhar_card_address: data.aadharCardAddress?.trim() || null,
          contact_number: data.contactNumber,
        })
        .select()
        .single();
      console.log("patientError is here hofhjsij j iosjfiodsjfi js", patientError);
      if (patientError?.code === '23505' && patientError.message.includes('aadhar_number')) {
        setAadharError('This Aadhar number is already registered in the system');
        setStep(4); // Force navigate to step 4 to show the error
        return;
      }
      if (patientError) throw patientError;

      // 2. Insert pregnancy details
      const { data: pregnancyData, error: pregnancyError } = await supabase
        .from("pregnancy_details")
        .insert({
          pregnant_woman_id: patientData.id,
          last_menstrual_period: data.lastMenstrualPeriod,
          number_of_children_alive: data.numberOfChildrenAlive,
        })
        .select()
        .single();

      if (pregnancyError) throw pregnancyError;

      // 3. Insert children if any
      if (data.children && data.children.length > 0) {
        const { error: childrenError } = await supabase.from("children").insert(
          data.children.map((child) => ({
            pregnancy_details_id: pregnancyData.id,
            gender: child.gender,
            age_in_years: child.ageInYears,
          }))
        );

        if (childrenError) throw childrenError;
      }

      // 4. Insert procedure
      const { data: procedureData, error: procedureError } = await supabase
        .from("procedures")
        .insert({
          pregnant_woman_id: patientData.id,
          procedure_date: data.procedureDate,
          attending_doctor_id: data.performingDoctorId,
          referring_doctor_id: data.referringDoctorId,
          scan_performed: data.scanPerformed,
        })
        .select()
        .single();

      if (procedureError) throw procedureError;

      // 5. Insert procedure indications
      if (data.selectedIndications.length > 0) {
        const { error: indicationsError } = await supabase
          .from("procedure_indications")
          .insert(
            data.selectedIndications.map((indicationId) => ({
              procedure_id: procedureData.id,
              indication_type_id: indicationId,
            }))
          );

        if (indicationsError) throw indicationsError;
      }

      // Determine if the patient has an Aadhar registered mobile
      const isAadharRegistered = data.hasAadharRegisteredMobile === "true";

      // 6. Insert consent with modified structure
      const { error: consentError } = await supabase.from("consent").insert({
        pregnant_woman_id: patientData.id,
        has_aadhar_registered_mobile: isAadharRegistered,
        mobile_number: data.consentMobile,
        otp_verified: true,
        verification_details: `Verified at ${new Date().toISOString()}`,
        // For patients with no Aadhar registered mobile, include relative details
        relative_name:
          data.hasAadharRegisteredMobile === "false" ? data.relativeName : null,
        relationship_to_patient:
          data.hasAadharRegisteredMobile === "false"
            ? data.relationshipToPatient
            : null,
        relative_contact_number:
          data.hasAadharRegisteredMobile === "false"
            ? data.consentMobile
            : null,
      });

      if (consentError) throw consentError;

      // Navigate back to dashboard after successful registration
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while submitting the form");
    }
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return !errors.name && !errors.age && !errors.contactNumber;
      case 2:
        return !errors.lastMenstrualPeriod && !errors.numberOfChildrenAlive;
      case 3:
        return (
          !errors.procedureDate &&
          !errors.performingDoctorId &&
          !errors.referringDoctorId &&
          !errors.scanPerformed
        );
      case 4:
        return (
          !errors.aadharNumber &&
          !errors.hasAadharRegisteredMobile &&
          !errors.relativeName &&
          !errors.relationshipToPatient &&
          !errors.relativeContactNumber
        );
      default:
        return true;
    }
  };

  const addNewPerformingDoctor = () => {
    setNewPerformingDoctors([
      ...newPerformingDoctors,
      { name: "", qualifications: "", registrationNumber: "", contactInfo: "" },
    ]);
  };

  const removeNewPerformingDoctor = (index: number) => {
    setNewPerformingDoctors(newPerformingDoctors.filter((_, i) => i !== index));
  };

  const updateNewPerformingDoctor = (
    index: number,
    field: keyof NewPerformingDoctor,
    value: string
  ) => {
    const updatedDoctors = [...newPerformingDoctors];
    updatedDoctors[index] = { ...updatedDoctors[index], [field]: value };
    setNewPerformingDoctors(updatedDoctors);
  };

  const addNewReferringDoctor = () => {
    setNewReferringDoctors([
      ...newReferringDoctors,
      {
        name: "",
        hospitalName: "",
        hospitalAddress: "",
        registrationNumber: "",
        contactInfo: "",
      },
    ]);
  };

  const removeNewReferringDoctor = (index: number) => {
    setNewReferringDoctors(newReferringDoctors.filter((_, i) => i !== index));
  };

  const updateNewReferringDoctor = (
    index: number,
    field: keyof NewReferringDoctor,
    value: string
  ) => {
    const updatedDoctors = [...newReferringDoctors];
    updatedDoctors[index] = { ...updatedDoctors[index], [field]: value };
    setNewReferringDoctors(updatedDoctors);
  };

  // Function to submit new performing doctors
  const handleSubmitNewPerformingDoctors = async () => {
    try {
      setIsSubmittingDoctor(true);
      setDoctorSubmissionError("");

      // Validate all required fields
      const isValid = newPerformingDoctors.every(
        (doctor) =>
          doctor.name &&
          doctor.qualifications &&
          doctor.registrationNumber &&
          doctor.contactInfo
      );

      if (!isValid) {
        setDoctorSubmissionError(
          "Please fill all required fields for all doctors"
        );
        return;
      }

      // Submit each doctor to the database
      for (const doctor of newPerformingDoctors) {
        const { error } = await supabase.from("performing_doctors").insert([
          {
            name: doctor.name,
            qualifications: doctor.qualifications,
            registration_number: doctor.registrationNumber,
            contact_info: doctor.contactInfo,
            diagnostic_center_id: diagnosticCenter.id,
          },
        ]);
        if (error) throw error;
      }

      // Refresh the performing doctors list
      const { data: updatedDoctors } = await supabase
        .from("performing_doctors")
        .select("*")
        .eq("diagnostic_center_id", diagnosticCenter.id);

      if (updatedDoctors) {
        setPerformingDoctors(updatedDoctors);
      }

      // Reset the new doctors form
      setNewPerformingDoctors([]);
      setShowNewPerformingDoctor(false);
      toast.success("Doctors added successfully!");
    } catch (error) {
      setDoctorSubmissionError("Failed to add doctors. Please try again.");
      console.error("Error adding doctors:", error);
    } finally {
      setIsSubmittingDoctor(false);
    }
  };

  // Similar function for referring doctors
  const handleSubmitNewReferringDoctors = async () => {
    try {
      setIsSubmittingDoctor(true);
      setDoctorSubmissionError("");

      const isValid = newReferringDoctors.every(
        (doctor) =>
          doctor.name &&
          doctor.hospitalName &&
          doctor.hospitalAddress &&
          doctor.registrationNumber &&
          doctor.contactInfo
      );

      if (!isValid) {
        setDoctorSubmissionError(
          "Please fill all required fields for all doctors"
        );
        return;
      }

      for (const doctor of newReferringDoctors) {
        const { error } = await supabase.from("referring_doctors").insert([
          {
            name: doctor.name,
            hospital_name: doctor.hospitalName,
            hospital_address: doctor.hospitalAddress,
            registration_number: doctor.registrationNumber,
            contact_info: doctor.contactInfo,
            diagnostic_center_id: diagnosticCenter.id,
          },
        ]);
        if (error) throw error;
      }

      // Refresh the referring doctors list
      const { data: updatedDoctors } = await supabase
        .from("referring_doctors")
        .select("*")
        .eq("diagnostic_center_id", diagnosticCenter.id);

      if (updatedDoctors) {
        setReferringDoctors(updatedDoctors);
      }

      setNewReferringDoctors([]);
      setShowNewReferringDoctor(false);
      toast.success("Referring doctors added successfully!");
    } catch (error) {
      setDoctorSubmissionError(
        "Failed to add referring doctors. Please try again."
      );
      console.error("Error adding referring doctors:", error);
    } finally {
      setIsSubmittingDoctor(false);
    }
  };

  // Sidebar steps: you can adjust the labels or add icons if desired
  const steps = [
    "General Details",
    "Family Details",
    "Medical Details",
    "Final Consent",
  ];

  // Watch for changes in the Aadhar registered mobile field
  const hasAadharRegisteredMobile = watch("hasAadharRegisteredMobile");

  return (
    <div className="min-h-screen bg-[#FFF4E8]">
      {/* HEADER */}
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex flex-col px-4 sm:px-6 lg:px-8 md:flex-row items-center justify-between bg-white shadow-sm rounded-lg">
          <h1 className="text-2xl py-4 font-bold text-gray-700">
            New Patient Registration
          </h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#774C60] text-white hover:bg-[#B75D69] transition-colors duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row bg-white shadow-lg rounded-lg overflow-hidden">
          {/* ASIDE / SIDEBAR */}
          <aside className="w-full md:w-1/3 lg:w-1/4 bg-gray-50 border-r border-gray-200 p-6">
            <nav className="space-y-4">
              {steps.map((label, index) => {
                const stepIndex = index + 1;
                const isActive = step === stepIndex;
                const isCompleted = step > stepIndex;

                return (
                  <div
                    key={label}
                    className={`flex items-center px-4 py-3 rounded-lg cursor-pointer 
                      ${
                        isActive
                          ? "bg-[#774C60] text-white"
                          : "bg-white text-gray-700 border border-gray-200"
                      }
                      ${isCompleted ? "opacity-80" : ""}
                    `}
                    onClick={() => {
                      // Allow user to go to that step if needed, or just display
                      // To keep the exact logic of "previous" and "next", you can omit the onClick here
                      if (stepIndex < step) setStep(stepIndex);
                    }}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full mr-4
                        ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isActive
                            ? "border-2 border-white"
                            : "border-2 border-gray-400"
                        }
                      `}
                    >
                      {isCompleted ? <Check size={16} /> : stepIndex}
                    </div>
                    <span className="font-medium">{label}</span>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* MAIN FORM AREA */}
          <div className="flex-1 p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1 - Basic Information */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    General Details
                  </h2>
                  {/* Aadhar Number - First Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aadhar Card Number *
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      {...register("aadharNumber", {
                        required: "Aadhar number is required",
                        validate: validateAadharNumber,
                      })}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        aadharError ? "border-red-500" : "border-gray-300"
                      } focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]`}
                      placeholder="Enter 12-digit Aadhar number"
                    />
                    {aadharError && (
                      <p className="mt-1 text-sm text-red-500">{aadharError}</p>
                    )}
                    {errors.aadharNumber && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.aadharNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        {...register("name", {
                          required: "Name is required",
                          minLength: {
                            value: 2,
                            message: "Name must be at least 2 characters",
                          },
                        })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                        placeholder="Enter first name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Age */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Age
                      </label>
                      <input
                        type="number"
                        {...register("age", {
                          required: "Age is required",
                          min: {
                            value: 18,
                            message: "Age must be at least 18",
                          },
                          max: {
                            value: 65,
                            message: "Age must be less than 65",
                          },
                        })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                      />
                      {errors.age && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.age.message}
                        </p>
                      )}
                    </div>

                    {/* Husband's Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Husband's Name
                      </label>
                      <input
                        type="text"
                        {...register("husbandName")}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                      />
                    </div>

                    {/* Father's Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        {...register("fatherName")}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                      />
                    </div>

                    {/* Present Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Present Address
                      </label>
                      <textarea
                        {...register("presentAddress", {
                          required: "Present address is required",
                          minLength: {
                            value: 10,
                            message: "Address must be at least 10 characters",
                          },
                        })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                        rows={3}
                      />
                      {errors.presentAddress && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.presentAddress.message}
                        </p>
                      )}
                    </div>

                    {/* Aadhar Card Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aadhar Card Address
                      </label>
                      <textarea
                        {...register("aadharCardAddress")}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                        rows={3}
                      />
                    </div>

                    {/* Contact Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        {...register("contactNumber", {
                          required: "Contact number is required",
                          validate: validatePhoneNumber,
                        })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                      />
                      {errors.contactNumber && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.contactNumber.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 - Pregnancy Details */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Family Details
                  </h2>
                  {/* LMP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Menstrual Period (LMP)
                    </label>
                    <input
                      type="date"
                      {...register("lastMenstrualPeriod", {
                        required: "LMP is required",
                        validate: validateLMP,
                      })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                    />
                    {errors.lastMenstrualPeriod && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.lastMenstrualPeriod.message}
                      </p>
                    )}
                  </div>

                  {/* Number of Children */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Children Alive
                    </label>
                    <input
                      type="number"
                      {...register("numberOfChildrenAlive", {
                        required: "This field is required",
                        min: {
                          value: 0,
                          message: "Cannot be negative",
                        },
                        max: {
                          value: 10,
                          message: "Cannot be more than 10",
                        },
                      })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                    />
                    {errors.numberOfChildrenAlive && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.numberOfChildrenAlive.message}
                      </p>
                    )}
                  </div>

                  {/* Children Details */}
                  {numberOfChildrenAlive > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                          Children Details
                        </h3>
                        <button
                          type="button"
                          onClick={addChild}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Child
                        </button>
                      </div>

                      {watch("children")?.map((_, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-md space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-md font-medium">
                              Child {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeChild(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Gender */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Gender
                              </label>
                              <select
                                {...register(`children.${index}.gender`)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            {/* Age */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Age (Years)
                              </label>
                              <input
                                type="number"
                                {...register(`children.${index}.ageInYears`, {
                                  required: "Age is required",
                                  min: {
                                    value: 0,
                                    message: "Age cannot be negative",
                                  },
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 - Procedure Details */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Medical Details
                  </h2>

                  {/* Procedure Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Procedure Date
                    </label>
                    <input
                      type="date"
                      {...register("procedureDate", {
                        required: "Procedure date is required",
                      })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                    />
                    {errors.procedureDate && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.procedureDate.message}
                      </p>
                    )}
                  </div>

                  {/* Performing Doctor */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Performing Doctor
                    </label>
                    <div className="flex items-center space-x-4">
                      <select
                        {...register("performingDoctorId", {
                          required:
                            !showNewPerformingDoctor &&
                            "Please select a performing doctor",
                        })}
                        disabled={showNewPerformingDoctor}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                      >
                        <option value="">Select existing doctor</option>
                        {performingDoctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name} - {doctor.qualifications}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewPerformingDoctor(!showNewPerformingDoctor);
                          if (!showNewPerformingDoctor) {
                            addNewPerformingDoctor();
                          } else {
                            setNewPerformingDoctors([]);
                          }
                        }}
                        className="px-8 py-2 text-sm font-medium rounded-md text-white bg-[#774C60] hover:bg-[#B75D69]"
                      >
                        {showNewPerformingDoctor ? "Select" : "Add New"}
                      </button>
                    </div>

                    {showNewPerformingDoctor && (
                      <div className="space-y-4 mt-4">
                        {newPerformingDoctors.map((doctor, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 space-y-4"
                          >
                            <div className="flex justify-between items-center">
                              <h4 className="text-md font-medium">
                                New Doctor {index + 1}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeNewPerformingDoctor(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={doctor.name}
                                  onChange={(e) =>
                                    updateNewPerformingDoctor(
                                      index,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewPerformingDoctor}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Qualifications
                                </label>
                                <input
                                  type="text"
                                  value={doctor.qualifications}
                                  onChange={(e) =>
                                    updateNewPerformingDoctor(
                                      index,
                                      "qualifications",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewPerformingDoctor}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Registration Number
                                </label>
                                <input
                                  type="text"
                                  value={doctor.registrationNumber}
                                  onChange={(e) =>
                                    updateNewPerformingDoctor(
                                      index,
                                      "registrationNumber",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewPerformingDoctor}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Contact Info
                                </label>
                                <input
                                  type="tel"
                                  value={doctor.contactInfo}
                                  onChange={(e) =>
                                    updateNewPerformingDoctor(
                                      index,
                                      "contactInfo",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewPerformingDoctor}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between mt-6">
                          <button
                            type="button"
                            onClick={addNewPerformingDoctor}
                            className="inline-flex items-center px-4 py-2 text-sm text-[#774C60] hover:text-[#B75D69]"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Another Doctor
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitNewPerformingDoctors}
                            disabled={
                              isSubmittingDoctor ||
                              newPerformingDoctors.length === 0
                            }
                            className={`inline-flex items-center px-6 py-2 rounded-lg text-white
                              ${
                                isSubmittingDoctor ||
                                newPerformingDoctors.length === 0
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-[#774C60] hover:bg-[#B75D69]"
                              }`}
                          >
                            {isSubmittingDoctor ? (
                              <>
                                <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                Submitting...
                              </>
                            ) : (
                              "Save"
                            )}
                          </button>
                        </div>
                        {doctorSubmissionError && (
                          <p className="text-red-500 text-sm mt-2">
                            {doctorSubmissionError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Referring Doctor (Optional) */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referring Doctor (Optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <select
                        {...register("referringDoctorId", {
                          required: "Please select a referring doctor",
                        })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                      >
                        <option value="">Select referring doctor</option>
                        {referringDoctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewReferringDoctor(!showNewReferringDoctor);
                          if (!showNewReferringDoctor) {
                            addNewReferringDoctor();
                          } else {
                            setNewReferringDoctors([]);
                          }
                        }}
                        className="px-8 py-2 text-sm font-medium rounded-md text-white bg-[#774C60] hover:bg-[#B75D69]"
                      >
                        {showNewReferringDoctor ? "Select" : "Add New"}
                      </button>
                    </div>

                    {showNewReferringDoctor && (
                      <div className="space-y-4 mt-4">
                        {newReferringDoctors.map((doctor, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 space-y-4"
                          >
                            <div className="flex justify-between items-center">
                              <h4 className="text-md font-medium">
                                New Referring Doctor {index + 1}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeNewReferringDoctor(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={doctor.name}
                                  onChange={(e) =>
                                    updateNewReferringDoctor(
                                      index,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewReferringDoctor}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Hospital Name
                                </label>
                                <input
                                  type="text"
                                  value={doctor.hospitalName}
                                  onChange={(e) =>
                                    updateNewReferringDoctor(
                                      index,
                                      "hospitalName",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewReferringDoctor}
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Hospital Address
                                </label>
                                <textarea
                                  value={doctor.hospitalAddress}
                                  onChange={(e) =>
                                    updateNewReferringDoctor(
                                      index,
                                      "hospitalAddress",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  rows={2}
                                  required={showNewReferringDoctor}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Registration Number
                                </label>
                                <input
                                  type="text"
                                  value={doctor.registrationNumber}
                                  onChange={(e) =>
                                    updateNewReferringDoctor(
                                      index,
                                      "registrationNumber",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewReferringDoctor}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Contact Info
                                </label>
                                <input
                                  type="tel"
                                  value={doctor.contactInfo}
                                  onChange={(e) =>
                                    updateNewReferringDoctor(
                                      index,
                                      "contactInfo",
                                      e.target.value
                                    )
                                  }
                                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3"
                                  required={showNewReferringDoctor}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between mt-6">
                          <button
                            type="button"
                            onClick={addNewReferringDoctor}
                            className="inline-flex items-center px-4 py-2 text-sm text-[#774C60] hover:text-[#B75D69]"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Another Doctor
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitNewReferringDoctors}
                            disabled={
                              isSubmittingDoctor ||
                              newReferringDoctors.length === 0
                            }
                            className={`inline-flex items-center px-6 py-2 rounded-lg text-white
                              ${
                                isSubmittingDoctor ||
                                newReferringDoctors.length === 0
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-[#774C60] hover:bg-[#B75D69]"
                              }`}
                          >
                            {isSubmittingDoctor ? (
                              <>
                                <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                Submitting...
                              </>
                            ) : (
                              "Save"
                            )}
                          </button>
                        </div>
                        {doctorSubmissionError && (
                          <p className="text-red-500 text-sm mt-2">
                            {doctorSubmissionError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Indications
                    </label>
                    <div className="space-y-2">
                      {indicationTypes.map((indication) => (
                        <label key={indication.id} className="flex items-start">
                          <input
                            type="checkbox"
                            value={indication.id}
                            {...register("selectedIndications")}
                            className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {indication.indication}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Scan Performed */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scan Performed
                    </label>
                    <select
                      {...register("scanPerformed", {
                        required: "Please select a scan",
                      })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                    >
                      <option value="">Select scan</option>
                      {scans.map((scan) => (
                        <option key={scan.id} value={scan.id}>
                          {scan.name}
                        </option>
                      ))}
                    </select>
                    {errors.scanPerformed && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.scanPerformed.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4 - Consent */}
              {/* Step 4 - Consent */}
              {step === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Patient Consent
                  </h2>

                  {/* Question: Does the patient have an Aadhar registered mobile number? */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-[#774C60] mb-2">
                      Does patient have Aadhar registered mobile number? *
                    </label>
                    <select
                      {...register("hasAadharRegisteredMobile", {
                        required: "Please select an option",
                      })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                    >
                      <option value="">Select an option</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                    {errors.hasAadharRegisteredMobile && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.hasAadharRegisteredMobile.message}
                      </p>
                    )}
                  </div>

                  {/* Conditional Rendering Based on Selection */}
                  {watch("hasAadharRegisteredMobile") && (
                    <div className="space-y-6">
                      {/* If patient does NOT have an Aadhar registered mobile number */}
                      {watch("hasAadharRegisteredMobile") === "false" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-[#774C60] mb-2">
                              Name of Relative *
                            </label>
                            <input
                              type="text"
                              {...register("relativeName", {
                                required: "Relative name is required",
                              })}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                              placeholder="Enter relative's name"
                            />
                            {errors.relativeName && (
                              <p className="mt-1 text-sm text-red-500">
                                {errors.relativeName.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#774C60] mb-2">
                              Relationship to Patient *
                            </label>
                            <select
                              {...register("relationshipToPatient", {
                                required: "Please select relationship",
                              })}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                            >
                              <option value="">Select relationship</option>
                              <option value="Husband">Husband</option>
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                              <option value="Mother in law">
                                Mother in law
                              </option>
                              <option value="Father in law">
                                Father in law
                              </option>
                              <option value="Brother in law">
                                Brother in law
                              </option>
                              <option value="Sister in law">
                                Sister in law
                              </option>
                              <option value="Other">Other</option>
                            </select>
                            {errors.relationshipToPatient && (
                              <p className="mt-1 text-sm text-red-500">
                                {errors.relationshipToPatient.message}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Mobile Number and OTP Section (applies for both Yes and No) */}
                      <div>
                        <label className="block text-sm font-medium text-[#774C60] mb-2">
                          {watch("hasAadharRegisteredMobile") === "true"
                            ? "Aadhar Registered Mobile Number *"
                            : "Relative's Mobile Number *"}
                        </label>
                        <div className="flex space-x-4">
                          <input
                            type="tel"
                            {...register("consentMobile", {
                              required: "Mobile number is required",
                              validate: validatePhoneNumber,
                            })}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                            maxLength={10}
                            disabled={showConsentOtp}
                            placeholder="Enter 10-digit mobile number"
                          />
                          {!showConsentOtp && (
                            <button
                              type="button"
                              onClick={handleSendConsentOtp}
                              className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69]"
                            >
                              Send OTP
                            </button>
                          )}
                        </div>
                        {errors.consentMobile && (
                          <p className="mt-1 text-sm text-red-500">
                            {errors.consentMobile.message}
                          </p>
                        )}
                      </div>

                      {/* OTP Verification Section */}
                      {showConsentOtp && !consentVerified && (
                        <div>
                          <label className="block text-sm font-medium text-[#774C60] mb-2">
                            Enter OTP
                          </label>
                          <div className="flex space-x-4">
                            <input
                              type="text"
                              {...register("consentOtp", {
                                required: "OTP is required",
                                minLength: {
                                  value: 6,
                                  message: "OTP must be 6 digits",
                                },
                              })}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#774C60] focus:ring-1 focus:ring-[#774C60]"
                              maxLength={6}
                              placeholder="Enter 6-digit OTP"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyConsentOtp}
                              className="px-4 py-2 bg-[#774C60] text-white rounded-lg hover:bg-[#B75D69]"
                            >
                              Verify OTP
                            </button>
                          </div>
                          {errors.consentOtp && (
                            <p className="mt-1 text-sm text-red-500">
                              {errors.consentOtp.message}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Success Message */}
                      {consentVerified && (
                        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                          <Check className="h-5 w-5" />
                          <span>Mobile number verified successfully</span>
                        </div>
                      )}

                      {aadharError && (
                        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                          <XCircle className="h-5 w-5" />
                          <span>{aadharError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div className="flex justify-between pt-6">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3 text-[#774C60] border border-[#774C60] rounded-lg hover:bg-[#774C60] hover:text-white"
                  >
                    Previous
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceedToNextStep()}
                    className={`px-6 py-3 rounded-lg ${
                      canProceedToNextStep()
                        ? "bg-[#774C60] text-white hover:bg-[#B75D69]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!consentVerified}
                    className={`px-6 py-3 rounded-lg ${
                      consentVerified
                        ? "bg-[#774C60] text-white hover:bg-[#B75D69]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Submit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
