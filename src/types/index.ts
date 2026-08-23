// User
export interface User {
  id: string;
  name: string;
  email: string;
}

// Medication
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  days: number;
}

// Prescription
export interface Prescription {
  id: string;
  patientName: string;
  date: string;
  hospital: string;
  medications: Medication[];
  imageUri: string | null;
}

// Schedule
export interface MedicationSchedule {
  id: string;
  date: string;
  label: string;
  medications: string[];
  taken: boolean;
}

// Calendar
export interface CalendarDayInfo {
  hasMed: boolean;
  taken: boolean;
}

// OCR
export interface OcrResult {
  patientName: string;
  date: string;
  hospital: string;
  medications: string;
}

// Navigation
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Prescription: undefined;
};
