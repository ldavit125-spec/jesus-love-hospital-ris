import type { FieldValue, Timestamp } from 'firebase/firestore';

export type UserRole = 'radiographer' | 'radiologist' | 'admin';

export type ExamStatus = '대기' | '검사중' | '완료';

export type InterpretationStatus = '판독대기' | '판독중' | '판독완료';

export type ModalityType =
  | 'X-ray'
  | 'CT'
  | 'MRI'
  | 'US'
  | 'MG'
  | 'C-arm'
  | 'Portable X-ray';

export type FirestoreDateTime = Timestamp | FieldValue | Date | string;

export interface Patient {
  id?: string;
  patientId: string; // 환자등록번호 (HIS 연동 ID)
  name: string;
  gender: 'M' | 'F';
  birthDate: string;
  age?: number;
  phone?: string;
  createdAt?: FirestoreDateTime;
  updatedAt?: FirestoreDateTime;
}

export interface Exam {
  id?: string;
  examId: string; // 검사접수번호
  patientId: string; // 환자등록번호
  patientName: string;
  orderDate: string; // 처방일시 (HIS 연동)
  department: string; // 처방과 (예: 내과, 정형외과 등)
  orderDoctor: string; // 처방의사
  modality: ModalityType;
  examCode: string;
  examName: string; // 검사명 (예: Chest PA, Brain CT 등)
  bodyPart: string; // 검사부위
  equipmentId: string; // 배정/사용 장비 ID
  status: ExamStatus; // 대기 -> 검사중 -> 완료
  interpretationStatus: InterpretationStatus; // 판독대기 -> 판독중 -> 판독완료
  urgency: '일반' | '응급' | '당일';
  radiographerId?: string; // 시행 방사선사
  radiographerName?: string;
  startedAt?: FirestoreDateTime; // 검사 시작 일시
  completedAt?: FirestoreDateTime; // 검사 완료 일시
  checklistId?: string; // CT/MRI 사전 체크리스트 참조 ID
  notes?: string;
  createdAt?: FirestoreDateTime;
  updatedAt?: FirestoreDateTime;
}

export interface ExamChecklist {
  id?: string;
  examId: string;
  patientId: string;
  modality: 'CT' | 'MRI';
  fastingConfirmed?: boolean; // 금식 여부
  contrastConsentConfirmed?: boolean; // 조영제 동의서
  kidneyFunctionChecked?: boolean; // eGFR/Creatinine 확인 여부
  creatinineLevel?: string;
  pacemakerOrImplantCheck?: boolean; // 심박조율기/체내 금속 여부 (MRI)
  claustrophobia?: boolean; // 폐쇄공포증 여부
  preMedicationGiven?: boolean; // 전처치 투약 여부
  verifiedBy: string; // 확인자 (방사선사 ID)
  verifiedAt: FirestoreDateTime;
  notes?: string;
}

export interface Report {
  id?: string;
  examId: string;
  patientId: string;
  radiologistId: string; // 판독의 ID
  radiologistName: string; // 판독의 성명
  findings: string; // 판독 소견
  conclusion: string; // 결론
  isCritical: boolean; // 긴급소견 여부
  status: InterpretationStatus; // 판독대기 | 판독중 | 판독완료
  draftedAt?: FirestoreDateTime;
  confirmedAt?: FirestoreDateTime; // 판독 확정 일시
  createdAt?: FirestoreDateTime;
  updatedAt?: FirestoreDateTime;
}

export interface Equipment {
  id: string; // 장비 식별자 (예: 'xray-1', 'ct-01')
  name: string; // 장비명 (예: 'X-ray 1', 'CT-01')
  modality: ModalityType;
  room: string; // 설치실 (예: '제1촬영실', 'CT실')
  status: '정상가동' | '검사중' | '점검중' | '비가동';
  ipAddress?: string;
  aeTitle?: string;
  port?: number;
  lastInspectionDate?: string;
  updatedAt?: FirestoreDateTime;
}

export interface EquipmentInspection {
  id?: string;
  equipmentId: string;
  equipmentName: string;
  inspectorId: string;
  inspectorName: string;
  inspectionType: '일일점검' | '정기점검' | '긴급수리';
  result: '정상' | '요주의' | '사용불가';
  itemsChecked: { [key: string]: boolean };
  remarks?: string;
  inspectedAt: FirestoreDateTime;
}

export interface Staff {
  id: string; // Firebase Auth UID
  staffNumber: string; // 사번
  name: string;
  email: string;
  role: UserRole; // 'radiographer' | 'radiologist' | 'admin'
  department: string; // 부서 (영상의학팀 등)
  phoneNumber?: string;
  isActive: boolean;
  createdAt?: FirestoreDateTime;
  updatedAt?: FirestoreDateTime;
}

export interface WorkSchedule {
  id?: string;
  staffId: string;
  staffName: string;
  role: UserRole;
  date: string; // YYYY-MM-DD
  shiftType: '데이' | '이브닝' | '나이트' | '당직' | '휴무';
  assignedRoom?: string; // 담당 촬영실
  createdAt?: FirestoreDateTime;
}

export interface Reservation {
  id?: string;
  patientId: string;
  patientName: string;
  modality: ModalityType;
  examName: string;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:mm
  status: '예약' | '접수완료' | '취소';
  department: string;
  notes?: string;
}

export interface SystemSettings {
  id?: string;
  hospitalName: string;
  autoInterpretationTransition: boolean; // 검사 완료 시 자동 판독대기 전환 플래그
  criticalNotificationEnabled: boolean;
  pacsServerConfig?: {
    aeTitle: string;
    host: string;
    port: number;
  };
  updatedAt?: FirestoreDateTime;
  updatedBy?: string;
}
