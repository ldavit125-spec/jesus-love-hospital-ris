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

// Safety Checklist Item check status: '확인 완료' | '해당 없음' | '추가 확인 필요' | '미확인'
export type ChecklistItemStatus = '확인 완료' | '해당 없음' | '추가 확인 필요' | '미확인';

// Overall Checklist clearance status: '검사 가능' | '확인 필요' | '검사 보류'
export type ChecklistOverallStatus = '검사 가능' | '확인 필요' | '검사 보류';

// MRI Safety Device/Implant Classification: MR Safe | MR Conditional | 미확인 | 해당 없음
export type MrCompatibilityStatus = 'MR Safe' | 'MR Conditional' | '미확인' | '해당 없음';

// Detailed MR Conditional Verification Details
export interface MrConditionalVerificationDetails {
  verified: boolean; // MR Conditional 조건 확인 완료 여부
  deviceManufacturer?: string; // 확인한 제조사
  deviceModel?: string; // 확인한 모델명
  allowedFieldStrength?: string; // 허용 자기장 조건 (예: 1.5T only, up to 3.0T 등)
  specificAbsorptionRateLimit?: string; // SAR 제한 조건
  spatialGradientLimit?: string; // 공간 자장 기울기 조건
  notes?: string; // 기타 제조사 조건 확인 메모
  verifiedBy?: string; // 확인자 (의사/전문방사선사 ID 또는 이름)
  verifiedAt?: FirestoreDateTime; // 확인 일시
}

export interface ExamChecklist {
  id?: string;
  examId: string;
  patientId: string;
  modality: 'CT' | 'MRI';
  
  // Overall safety verdict
  overallStatus?: ChecklistOverallStatus; // '검사 가능' | '확인 필요' | '검사 보류'

  // CT Specific Protocol Configurations (검사 프로토콜별 필수 검증 항목 정의)
  ctProtocol?: {
    requiresContrast?: boolean; // 조영제 필수 여부
    requiresFasting?: boolean;  // 금식 필수 여부
    requiresIvAccess?: boolean; // IV 정맥라인 필수 여부
    requiresKidneyFunction?: boolean; // 신장기능 필수 여부
  };

  // Common Safety Items
  usesContrast?: boolean; // 조영제 사용 여부
  contrastAllergy?: ChecklistItemStatus; // 조영제 알레르기 여부
  kidneyFunction?: ChecklistItemStatus; // 신장기능 (eGFR/Creatinine) 확인
  creatinineLevel?: string;
  pregnancyRisk?: ChecklistItemStatus; // 임신 가능성
  mobilityStatus?: ChecklistItemStatus; // 이동/체위/휠체어 보행보조 가능 여부

  // CT Specific Items
  fastingConfirmed?: ChecklistItemStatus; // 금식 여부
  ivAccessConfirmed?: ChecklistItemStatus; // 정맥주사(IV) 확보 여부
  contrastConsentConfirmed?: ChecklistItemStatus; // 조영제 동의서 확인 여부

  // MRI Specific Items & Compatibility Classifications
  pacemakerOrElectronics?: ChecklistItemStatus; // 심박조율기/체내 전자기기
  pacemakerMrStatus?: MrCompatibilityStatus; // 심박조율기 MR 안전성 분류
  pacemakerConditionalDetails?: MrConditionalVerificationDetails; // 조율기 MR Conditional 조건 검증 세부정보
  
  metallicImplants?: ChecklistItemStatus; // 금속성 보형물/삽입물 (인공관절 등)
  implantMrStatus?: MrCompatibilityStatus; // 보형물 MR 안전성 분류 ('MR Safe' | 'MR Conditional' | '미확인')
  implantConditionalDetails?: MrConditionalVerificationDetails; // 보형물 MR Conditional 조건 검증 세부정보
  mrConditionalRequirementsVerified?: boolean; // MR Conditional 조건 최종 확인 여부
  mriCompatibilityConfirmed?: boolean; // 최종 호환성 확인 여부

  clipsCoilsStents?: ChecklistItemStatus; // 클립/코일/스텐트
  clipsMrStatus?: MrCompatibilityStatus;
  clipsConditionalDetails?: MrConditionalVerificationDetails;

  internalFixations?: ChecklistItemStatus; // 체내 고정물
  foreignMetalBodies?: ChecklistItemStatus; // 금속성 이물
  removableMetalsHearingAids?: ChecklistItemStatus; // 보청기 등 제거 가능한 금속
  claustrophobia?: ChecklistItemStatus; // 폐쇄공포증 여부
  preMedicationGiven?: boolean; // 전처치 투약 여부

  verifiedBy?: string; // 확인자 (방사선사 ID 또는 이름)
  verifiedAt?: FirestoreDateTime;
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
  id?: string;
  equipmentId: string; // DR-01, CT-01, MR-01 등
  name: string;
  modality: ModalityType;
  roomName: string;
  status: '정상' | '점검중' | '고장' | '사용중지';
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  notes?: string;
}

export interface EquipmentInspection {
  id?: string;
  equipmentId: string;
  inspectionDate: string;
  inspectorName: string;
  result: '적합' | '주의' | '부적합';
  checklistDetails?: Record<string, boolean>;
  notes?: string;
  createdAt?: FirestoreDateTime;
}

export interface Staff {
  id?: string;
  staffId: string;
  name: string;
  role: UserRole;
  gender: 'M' | 'F';
  modalityAssigned?: ModalityType[];
  phone?: string;
  status: '재직' | '휴가' | '퇴사';
}

export interface WorkSchedule {
  id?: string;
  date: string;
  shift: '주간' | '야간' | '당직';
  staffId: string;
  staffName: string;
  equipmentId: string;
  modality: ModalityType;
  createdAt?: FirestoreDateTime;
}

export interface Reservation {
  id?: string;
  reservationId: string;
  patientId: string;
  patientName: string;
  reservationDate: string;
  reservationTime: string;
  modality: ModalityType;
  equipmentId: string;
  examName: string;
  status: '예약완료' | '방문확인' | '취소' | '노쇼';
  notes?: string;
  createdAt?: FirestoreDateTime;
}

export interface SystemSettings {
  id?: string;
  hospitalName: string;
  risTitle: string;
  ttsRate: number;
  ttsPitch: number;
  defaultStatus: ExamStatus;
  alertsEnabled: boolean;
  updatedAt?: FirestoreDateTime;
}
