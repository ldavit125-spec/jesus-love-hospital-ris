import { collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { db } from './config';
import type {
  Patient,
  Exam,
  ExamChecklist,
  Report,
  Equipment,
  EquipmentInspection,
  Staff,
  WorkSchedule,
  Reservation,
  SystemSettings,
} from './types';

// Generic helper to create typed collection references
const createCollection = <T = DocumentData>(collectionName: string): CollectionReference<T> | null => {
  if (!db) return null;
  return collection(db, collectionName) as CollectionReference<T>;
};

export const COLLECTIONS = {
  PATIENTS: 'patients',
  EXAMS: 'exams',
  EXAM_CHECKLISTS: 'examChecklists',
  REPORTS: 'reports',
  EQUIPMENT: 'equipment',
  EQUIPMENT_INSPECTIONS: 'equipmentInspections',
  STAFF: 'staff',
  WORK_SCHEDULES: 'workSchedules',
  RESERVATIONS: 'reservations',
  SYSTEM_SETTINGS: 'systemSettings',
} as const;

export const getPatientsCollection = () => createCollection<Patient>(COLLECTIONS.PATIENTS);
export const getExamsCollection = () => createCollection<Exam>(COLLECTIONS.EXAMS);
export const getExamChecklistsCollection = () => createCollection<ExamChecklist>(COLLECTIONS.EXAM_CHECKLISTS);
export const getReportsCollection = () => createCollection<Report>(COLLECTIONS.REPORTS);
export const getEquipmentCollection = () => createCollection<Equipment>(COLLECTIONS.EQUIPMENT);
export const getEquipmentInspectionsCollection = () => createCollection<EquipmentInspection>(COLLECTIONS.EQUIPMENT_INSPECTIONS);
export const getStaffCollection = () => createCollection<Staff>(COLLECTIONS.STAFF);
export const getWorkSchedulesCollection = () => createCollection<WorkSchedule>(COLLECTIONS.WORK_SCHEDULES);
export const getReservationsCollection = () => createCollection<Reservation>(COLLECTIONS.RESERVATIONS);
export const getSystemSettingsCollection = () => createCollection<SystemSettings>(COLLECTIONS.SYSTEM_SETTINGS);
