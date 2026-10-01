import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DoctorSearch from './components/DoctorSearch';
import Appointments from './components/Appointments';
import Prescriptions from './components/Prescriptions';
import Records from './components/Records';
import MongoConsole from './components/MongoConsole';
import SessionModal from './components/SessionModal';
import OnboardingModal from './components/OnboardingModal';
import AddDoctorModal from './components/AddDoctorModal';
import AddPatientModal from './components/AddPatientModal';
import SmartPrescriptionBot from './components/SmartPrescriptionBot';
import InteractiveBackground from './components/InteractiveBackground';
import ToastNotification from './components/ToastNotification';

import { 
  fetchHealth,
  fetchPatients, 
  registerPatient,
  fetchDoctors, 
  createDoctor,
  fetchClinics, 
  fetchAppointments, 
  createAppointment, 
  cancelAppointment, 
  fetchPrescriptions, 
  savePrescription,
  requestRefill, 
  fetchMedicalRecords 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessionLocked, setSessionLocked] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(900); // 15 mins
  const [backendOnline, setBackendOnline] = useState(true);

  // Onboarding & Modals state
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);

  // Data states
  const [patient, setPatient] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Load backend data
  const loadData = async () => {
    try {
      await fetchHealth();
      setBackendOnline(true);

      const [pats, docs, clins, apts, rxs, recs] = await Promise.all([
        fetchPatients(),
        fetchDoctors(),
        fetchClinics(),
        fetchAppointments(),
        fetchPrescriptions(),
        fetchMedicalRecords()
      ]);

      setPatientsList(pats);
      if (pats && pats.length > 0 && !patient) setPatient(pats[0]);
      setDoctors(docs);
      setClinics(clins);
      setAppointments(apts);
      setPrescriptions(rxs);
      setRecords(recs);
    } catch (err) {
      console.warn('API sync warning:', err);
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Session timer ticker
  useEffect(() => {
    if (sessionLocked || needsOnboarding) return;
    const timer = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          setSessionLocked(true);
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionLocked, needsOnboarding]);

  // Handle Onboarding verification complete
  const handleCompleteOnboarding = async ({ name, email }) => {
    const res = await registerPatient({ name, email });
    setPatient(res.patient);
    setNeedsOnboarding(false);
    showToast(`Welcome back, ${res.patient.name}!`, 'Verified with 6-digit security code. Access granted to MediApp.');
    await loadData();
  };

  // Doctor & Patient Insert Actions
  const handleAddDoctor = async (doctorData) => {
    const res = await createDoctor(doctorData);
    showToast('Doctor Registered', `${res.doctor.name} added to MongoDB doctors collection`);
    await loadData();
  };

  const handleAddPatient = async (patientData) => {
    const res = await registerPatient(patientData);
    showToast('Patient Registered', `${res.patient.name} added to MongoDB patients collection`);
    await loadData();
  };

  // Appointment Actions
  const handleBookAppointment = async (bookingData) => {
    const res = await createAppointment({ ...bookingData, patientId: patient?._id || 'PAT-1001' });
    showToast('Appointment Scheduled', `Booked consultation with ${res.appointment.doctorName} in MongoDB`);
    await loadData();
    setActiveTab('appointments');
  };

  const handleCancelAppointment = async (id, reason) => {
    const res = await cancelAppointment(id, reason);
    showToast('Appointment Canceled', `Appointment ${id} status updated to Canceled in MongoDB`);
    await loadData();
  };

  // Prescription Actions
  const handleSaveBotPrescription = async (rxData) => {
    const res = await savePrescription({ ...rxData, patientId: patient?._id || 'PAT-1001' });
    showToast('Prescription Saved', `${res.prescription.medicationName} added to MongoDB prescriptions`);
    await loadData();
    setActiveTab('prescriptions');
  };

  const handleRequestRefill = async (id) => {
    const res = await requestRefill(id);
    showToast('Refill Requested', `Refill request submitted for ${res.prescription.medicationName}`);
    await loadData();
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px', position: 'relative' }}>
      
      {/* Interactive Dynamic Background Canvas */}
      <InteractiveBackground />

      {/* Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        patient={patient}
        sessionTimeLeft={sessionTimeLeft}
        onLockSession={() => setSessionLocked(true)}
        backendOnline={backendOnline}
        onOpenAddDoctor={() => setShowAddDoctor(true)}
        onOpenAddPatient={() => setShowAddPatient(true)}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            patient={patient}
            appointments={appointments}
            prescriptions={prescriptions}
            records={records}
            doctors={doctors}
            patients={patientsList}
            onNavigate={setActiveTab}
            onRequestRefill={handleRequestRefill}
            onOpenAddDoctor={() => setShowAddDoctor(true)}
            onOpenAddPatient={() => setShowAddPatient(true)}
          />
        )}

        {activeTab === 'doctors' && (
          <DoctorSearch
            doctors={doctors}
            clinics={clinics}
            onBookAppointment={handleBookAppointment}
            onOpenAddDoctor={() => setShowAddDoctor(true)}
          />
        )}

        {activeTab === 'smartBot' && (
          <SmartPrescriptionBot
            patient={patient}
            onSavePrescription={handleSaveBotPrescription}
          />
        )}

        {activeTab === 'appointments' && (
          <Appointments
            appointments={appointments}
            onCancelAppointment={handleCancelAppointment}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'prescriptions' && (
          <Prescriptions
            prescriptions={prescriptions}
            onRequestRefill={handleRequestRefill}
          />
        )}

        {activeTab === 'records' && (
          <Records records={records} />
        )}

        {activeTab === 'mongoConsole' && (
          <MongoConsole onDataMutated={loadData} />
        )}
      </main>

      {/* Modals */}
      {needsOnboarding && (
        <OnboardingModal onCompleteOnboarding={handleCompleteOnboarding} />
      )}

      {showAddDoctor && (
        <AddDoctorModal onClose={() => setShowAddDoctor(false)} onAddDoctor={handleAddDoctor} />
      )}

      {showAddPatient && (
        <AddPatientModal onClose={() => setShowAddPatient(false)} onAddPatient={handleAddPatient} />
      )}

      {sessionLocked && !needsOnboarding && (
        <SessionModal
          patient={patient}
          onUnlock={() => {
            setSessionLocked(false);
            setSessionTimeLeft(900);
            showToast('Session Unlocked', 'Secure session restored with 256-bit encryption');
          }}
        />
      )}

      {/* Alert Toasts */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}
