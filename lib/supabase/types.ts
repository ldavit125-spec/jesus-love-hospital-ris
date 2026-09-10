export type PatientGender = '남' | '여' | '기타';
export type StaffRole = '방사선사' | '전문의' | '간호사' | '관리자';
export type ExamStatus = '대기' | '검사중' | '완료' | '취소';
export type ExamUrgency = '일반' | '응급';
export type InterpretationStatus = '판독대기' | '판독중' | '판독완료';
export type ChecklistOverallStatus = '검사 가능' | '확인 필요' | '검사 보류';
export type ChecklistItemStatus = '확인 완료' | '미확인' | '해당 없음' | '추가 확인 필요';
export type MRStatus = 'MR Safe' | 'MR Conditional' | 'MR Unsafe' | '미확인';
export type EquipmentStatus =
  | '사용가능'
  | '사용중'
  | '점검중'
  | '고장'
  | '사용중지';

export type AppRole = 'rt' | 'radiologist' | 'admin';

export interface Profile {
  id: string;
  name: string;
  role: AppRole;
  created_at?: string;
}

export interface Patient {
  id: string;
  name: string;
  birth_date?: string | null;
  gender?: PatientGender;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Exam {
  id: string;
  accession_number?: string | null;
  patient_id?: string | null;
  patient_name: string;
  exam_name: string;
  modality: string;
  equipment_id?: string | null;
  department?: string;
  order_doctor?: string;
  radiographer_id?: string | null;
  radiographer_name?: string;
  status: ExamStatus;
  urgency: ExamUrgency;
  interpretation_status: InterpretationStatus | null;
  order_date: string;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  patients?: Patient | null;
}

export interface ExamChecklist {
  id: string;
  exam_id: string;
  overall_status: ChecklistOverallStatus;
  pregnancy_risk?: ChecklistItemStatus;
  mobility_status?: ChecklistItemStatus;
  fasting_confirmed?: ChecklistItemStatus;
  uses_contrast?: boolean;
  contrast_consent_confirmed?: ChecklistItemStatus;
  contrast_allergy?: ChecklistItemStatus;
  kidney_function?: ChecklistItemStatus;
  iv_access_confirmed?: ChecklistItemStatus;
  pacemaker_or_electronics?: ChecklistItemStatus;
  pacemaker_mr_status?: MRStatus;
  metallic_implants?: ChecklistItemStatus;
  implant_mr_status?: MRStatus;
  clips_coils_stents?: ChecklistItemStatus;
  clips_mr_status?: MRStatus;
  internal_fixations?: ChecklistItemStatus;
  foreign_metal_bodies?: ChecklistItemStatus;
  removable_metals_hearing_aids?: ChecklistItemStatus;
  claustrophobia?: ChecklistItemStatus;
  or_carm_safety?: any;
  us_protocol?: any;
  us_preparation?: any;
  checked_by?: string;
  checked_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Report {
  id: string;
  exam_id: string;
  findings: string;
  conclusion?: string | null;
  status: string;
  radiologist_id?: string | null;
  radiologist_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  department?: string | null;
  email?: string | null;
  created_at?: string;
}

export interface WorkSchedule {
  id: string;
  staff_id?: string | null;
  schedule_date?: string | null;
  shift_type?: string | null;
  equipment_id?: string | null;
  status?: string | null;
  created_at?: string;
}

export interface Equipment {
  id: string;
  name: string;
  modality: string;
  room_name?: string | null;
  status: EquipmentStatus | string;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentInspection {
  id: string;
  equipment_id: string;
  inspection_date: string;
  inspector_name?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string;
}

export interface Reservation {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  exam_name?: string | null;
  modality?: string | null;
  equipment_id?: string | null;
  reservation_date: string;
  reservation_time: string;
  created_at?: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  updated_at?: string;
}

export interface ExamQueryFilter {
  modality?: string;
  status?: string;
  equipment_id?: string;
  patient_id?: string;
  date?: string;
}
