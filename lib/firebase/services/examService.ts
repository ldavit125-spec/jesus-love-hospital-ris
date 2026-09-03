import {
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  QueryConstraint,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config';
import { getExamsCollection, getExamChecklistsCollection } from '../collections';
import type { Exam, ExamChecklist, ChecklistOverallStatus, ChecklistItemStatus } from '../types';

export interface ExamQueryFilter {
  status?: string;
  equipmentId?: string;
  modality?: string;
  orderDate?: string;
}

/**
 * Fetch exams with optional filtering
 */
export async function getExams(filters?: ExamQueryFilter): Promise<Exam[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const colRef = getExamsCollection();
    if (!colRef) return [];

    const constraints: QueryConstraint[] = [];
    if (filters?.status && filters.status !== '전체 상태') {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters?.equipmentId && filters.equipmentId !== '전체 장비') {
      constraints.push(where('equipmentId', '==', filters.equipmentId));
    }
    if (filters?.modality && filters.modality !== '전체 Modality') {
      constraints.push(where('modality', '==', filters.modality));
    }

    const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error: any) {
    console.error('[examService] getExams error:', error);
    return [];
  }
}

/**
 * Fetch a single exam by doc ID or examId
 */
export async function getExamById(idOrExamId: string): Promise<Exam | null> {
  if (!isFirebaseConfigured || !db || !idOrExamId) {
    return null;
  }

  try {
    const colRef = getExamsCollection();
    if (!colRef) return null;

    // Direct doc ID
    const docRef = doc(colRef, idOrExamId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    // Query by examId
    const q = query(colRef, where('examId', '==', idOrExamId));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      return { id: firstDoc.id, ...firstDoc.data() };
    }

    return null;
  } catch (error: any) {
    console.error('[examService] getExamById error:', error);
    return null;
  }
}

/**
 * Helper: Resolve Firestore DocumentReference for an exam
 */
async function resolveExamDocRef(idOrExamId: string) {
  if (!isFirebaseConfigured || !db) return null;
  const colRef = getExamsCollection();
  if (!colRef) return null;

  const directRef = doc(colRef, idOrExamId);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    return { docRef: directRef, currentData: directSnap.data() as Exam };
  }

  const q = query(colRef, where('examId', '==', idOrExamId));
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    const firstDoc = qSnap.docs[0];
    return { docRef: firstDoc.ref, currentData: firstDoc.data() as Exam };
  }

  return null;
}

function isItemCleared(status?: ChecklistItemStatus): boolean {
  return status === '확인 완료' || status === '해당 없음';
}

/**
 * 4. Strict Fail-Closed CT/MRI Safety Checklist Validator
 * - Non-CT/MRI exams pass automatically.
 * - CT/MRI exams MUST pass: missing doc, incomplete item, or Firestore error will ALWAYS block (fail-closed).
 * - Raw Firebase errors are hidden from the UI message and only logged via console.error.
 */
export async function validateExamChecklist(
  examId: string,
  modality: string,
  equipmentId?: string
): Promise<{
  isValid: boolean;
  clearanceStatus: ChecklistOverallStatus;
  reason?: string;
  checklist?: ExamChecklist;
}> {
  // Check whether this is an operating room C-arm exam
  const isOrCarm =
    modality === 'C-arm' &&
    (equipmentId?.includes('수술실') || equipmentId === 'C-arm · 수술실');
  const isUS = modality === 'US' || modality === 'Ultrasound';

  // 1. Non-CT/MRI/OR-C-arm/US modalities (X-ray, MG, Fluoroscopy C-arm, etc.) pass automatically
  if (!['CT', 'MRI'].includes(modality) && !isOrCarm && !isUS) {
    return { isValid: true, clearanceStatus: '검사 가능' };
  }

  // 2. Fail-closed: If Firebase is not configured or DB is inaccessible -> BLOCK
  if (!isFirebaseConfigured || !db) {
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: '시스템 안전 검증 모듈이 준비되지 않아 검사를 시작할 수 없습니다. (검사 보류)',
    };
  }

  try {
    const colRef = getExamChecklistsCollection();
    if (!colRef) {
      return {
        isValid: false,
        clearanceStatus: '검사 보류',
        reason: '안전 검증 모듈 연결 실패로 검사를 시작할 수 없습니다.',
      };
    }

    const q = query(colRef, where('examId', '==', examId));
    const snap = await getDocs(q);

    // Fail-closed for CT/MRI/OR-C-arm. For US: if no checklist doc exists, pass automatically (no protocol requirements specified)
    if (snap.empty) {
      if (isUS) {
        return { isValid: true, clearanceStatus: '검사 가능' };
      }
      return {
        isValid: false,
        clearanceStatus: '검사 보류',
        reason: `${modality} 사전 안전 체크리스트가 등록되지 않았습니다. 체크리스트 확인을 먼저 완료해 주세요.`,
      };
    }

    const checklist = snap.docs[0].data() as ExamChecklist;

    // Explicit Hold Check
    if (checklist.overallStatus === '검사 보류') {
      return {
        isValid: false,
        clearanceStatus: '검사 보류',
        reason: '체크리스트 판정 상태가 [검사 보류]로 지정되어 있습니다.',
        checklist,
      };
    }

    // -------------------------------------------------------------
    // CT Checklist Validation (Configurable by Exam Protocol)
    // -------------------------------------------------------------
    if (modality === 'CT') {
      const proto = checklist.ctProtocol || {};

      // 1. 임신 가능성 (CT 방사선 피폭 안전 기본 필수 항목)
      if (!isItemCleared(checklist.pregnancyRisk)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '임신 가능성 확인이 완료되지 않았습니다.', checklist };
      }

      // 2. 이동 / 체위 가능 여부
      if (!isItemCleared(checklist.mobilityStatus)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '이동 및 검사 체위 유지 가능 여부가 확인되지 않았습니다.', checklist };
      }

      // 3. 금식 여부 (프로토콜 지정 또는 조영제 사용 시 필수)
      const requiresFasting = proto.requiresFasting ?? (checklist.usesContrast !== false);
      if (requiresFasting) {
        if (!isItemCleared(checklist.fastingConfirmed)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '금식 여부 확인이 완료되지 않았습니다.', checklist };
        }
      }

      // 4. 조영제 관련 항목 (프로토콜에서 지정했거나 usesContrast인 경우에만 강제)
      const usesContrast = proto.requiresContrast ?? (checklist.usesContrast === true);
      if (usesContrast) {
        if (!isItemCleared(checklist.contrastConsentConfirmed)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '조영제 사용 동의서가 확인되지 않았습니다.', checklist };
        }
        if (!isItemCleared(checklist.contrastAllergy)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '조영제 알레르기 반응 이력 확인이 완료되지 않았습니다.', checklist };
        }
        if (proto.requiresKidneyFunction !== false && !isItemCleared(checklist.kidneyFunction)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '신장기능(eGFR/Creatinine) 수치 확인이 완료되지 않았습니다.', checklist };
        }
        if (proto.requiresIvAccess !== false && !isItemCleared(checklist.ivAccessConfirmed)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '정맥주사(IV) 혈관 라인 확보가 확인되지 않았습니다.', checklist };
        }
      }
    }

    // -------------------------------------------------------------
    // MRI Checklist Validation (Strict Safety & MR Compatibility)
    // -------------------------------------------------------------
    if (modality === 'MRI') {
      // 1. 임신 가능성
      if (!isItemCleared(checklist.pregnancyRisk)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '임신 가능성 확인이 완료되지 않았습니다.', checklist };
      }

      // 2. 심박조율기 및 활성 전자기기 (MR Safe / MR Conditional / 미확인 구분)
      if (checklist.pacemakerOrElectronics === '확인 완료') {
        const mrStatus = checklist.pacemakerMrStatus;
        if (!mrStatus || mrStatus === '미확인') {
          return {
            isValid: false,
            clearanceStatus: '검사 보류',
            reason: '체내 전자기기의 MR 안전성 분류가 확인되지 않았습니다. (검사 보류)',
            checklist,
          };
        }
        if (mrStatus === 'MR Conditional') {
          const condVerified = checklist.pacemakerConditionalDetails?.verified === true;
          if (!condVerified) {
            return {
              isValid: false,
              clearanceStatus: '확인 필요',
              reason: '심박조율기가 [MR Conditional] 기기입니다. 세부 제조사/자기장 조건 확인이 완료되어야 검사가 가능합니다.',
              checklist,
            };
          }
        }
      } else if (!isItemCleared(checklist.pacemakerOrElectronics)) {
        return {
          isValid: false,
          clearanceStatus: '검사 보류',
          reason: '심박동기 및 체내 전자기기 확인이 완료되지 않았습니다.',
          checklist,
        };
      }

      // 3. 인공관절 및 금속 임플란트 (MR Safe / MR Conditional / 미확인 구분)
      if (checklist.metallicImplants === '확인 완료') {
        const implantStatus = checklist.implantMrStatus;
        if (!implantStatus || implantStatus === '미확인') {
          return {
            isValid: false,
            clearanceStatus: '확인 필요',
            reason: '체내 금속 보형물의 MR 안전성 분류(MR Safe / MR Conditional)가 확인되지 않았습니다.',
            checklist,
          };
        }
        if (implantStatus === 'MR Conditional') {
          const condVerified =
            checklist.mrConditionalRequirementsVerified === true ||
            checklist.implantConditionalDetails?.verified === true;
          if (!condVerified) {
            return {
              isValid: false,
              clearanceStatus: '확인 필요',
              reason: '금속 보형물이 [MR Conditional] 기기입니다. 허용 자기장 및 기기별 촬영 조건 확인이 필요합니다.',
              checklist,
            };
          }
        }
      } else if (!isItemCleared(checklist.metallicImplants)) {
        return {
          isValid: false,
          clearanceStatus: '확인 필요',
          reason: '금속성 보형물/삽입물 확인이 완료되지 않았습니다.',
          checklist,
        };
      }

      // 4. 수술용 클립 / 코일 / 스텐트 (MR Safe / MR Conditional / 미확인 구분)
      if (checklist.clipsCoilsStents === '확인 완료') {
        const clipStatus = checklist.clipsMrStatus;
        if (!clipStatus || clipStatus === '미확인') {
          return {
            isValid: false,
            clearanceStatus: '확인 필요',
            reason: '수술용 클립/코일/스텐트의 MR 호환성이 확인되지 않았습니다.',
            checklist,
          };
        }
        if (clipStatus === 'MR Conditional') {
          const condVerified = checklist.clipsConditionalDetails?.verified === true;
          if (!condVerified) {
            return {
              isValid: false,
              clearanceStatus: '확인 필요',
              reason: '클립/코일/스텐트가 [MR Conditional] 기기입니다. 허용 촬영 조건 확인이 필요합니다.',
              checklist,
            };
          }
        }
      } else if (!isItemCleared(checklist.clipsCoilsStents)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '수술용 클립/코일/스텐트 확인이 완료되지 않았습니다.', checklist };
      }

      // 5. 체내 고정물
      if (!isItemCleared(checklist.internalFixations)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '체내 금속성 고정물 확인이 완료되지 않았습니다.', checklist };
      }

      // 6. 금속성 안구/신체 이물질
      if (!isItemCleared(checklist.foreignMetalBodies)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '금속성 이물질 여부 확인이 완료되지 않았습니다.', checklist };
      }

      // 7. 제거 가능한 외장 금속 및 보청기
      if (!isItemCleared(checklist.removableMetalsHearingAids)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '보청기 및 체외 금속물질 탈거 확인이 완료되지 않았습니다.', checklist };
      }

      // 8. 이동 및 체위 유지
      if (!isItemCleared(checklist.mobilityStatus)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '이동 및 검사 체위 유지 가능 여부가 확인되지 않았습니다.', checklist };
      }

      // 9. 폐쇄공포증 여부
      if (!isItemCleared(checklist.claustrophobia)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '폐쇄공포증 여부 확인이 완료되지 않았습니다.', checklist };
      }

      // 10. 조영제 사용 검사인 경우
      if (checklist.usesContrast) {
        if (!isItemCleared(checklist.contrastAllergy)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: 'MRI 조영제 알레르기 반응 이력 확인이 완료되지 않았습니다.', checklist };
        }
        if (!isItemCleared(checklist.kidneyFunction)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '신장기능(eGFR) 확인이 완료되지 않았습니다.', checklist };
        }
      }
    }

    // -------------------------------------------------------------
    // Operating Room C-arm (수술실 C-arm) Preoperative Fasting Safety Validation
    // - Applied ONLY to OR C-arm (투시실 C-arm 제외)
    // - Preoperative fasting must be '확인 완료' OR '해당 없음/의료진 확인'
    // - '추가 확인 필요' or '미확인' MUST block exam start
    // - '해당 없음/의료진 확인' requires medical staff clinical verification info
    // -------------------------------------------------------------
    if (isOrCarm) {
      const orSafety = checklist.orCarmSafety;
      const fastingStatus = orSafety?.fastingStatus;

      // 1. Strict block on '추가 확인 필요' or '미확인' or missing
      if (!fastingStatus || fastingStatus === '미확인' || fastingStatus === '추가 확인 필요') {
        return {
          isValid: false,
          clearanceStatus: '확인 필요',
          reason: '수술실 C-arm 검사 전 금식 상태 확인이 완료되지 않았습니다. (추가 확인 필요)',
          checklist,
        };
      }

      // 2. If '해당 없음/의료진 확인', verify that medical staff clinical verification is recorded
      if (fastingStatus === '해당 없음/의료진 확인') {
        const staffVerif = orSafety?.medicalStaffVerification;
        if (!staffVerif || !staffVerif.verifiedDoctor || !staffVerif.clinicalReason) {
          return {
            isValid: false,
            clearanceStatus: '확인 필요',
            reason: '수술팀/마취과 의료진의 임상 확인 정보(확인 의료진, 사유)가 기록되어야 검사 시작이 가능합니다.',
            checklist,
          };
        }
      }
    }

    // -------------------------------------------------------------
    // Ultrasound (초음파) Protocol-Specific Preparation Validation
    // - Not all US exams require fasting.
    // - Only validate preparations explicitly marked required by the protocol.
    // - If no preparation is required, pass automatically.
    // -------------------------------------------------------------
    if (isUS) {
      const usProto = checklist.usProtocol || {};
      const usPrep = checklist.usPreparation || {};

      // 1. 금식(Fasting) 필수 프로토콜인 경우 검증
      if (usProto.requiresFasting === true) {
        const fastingConfirmed = usPrep.fastingConfirmed;
        if (!isItemCleared(fastingConfirmed)) {
          return {
            isValid: false,
            clearanceStatus: '확인 필요',
            reason: '해당 초음파 검사는 사전 금식(6~8시간) 확인이 필수입니다. (미확인/추가 확인 필요)',
            checklist,
          };
        }
      }

      // 2. 방광 충만(Full Bladder) 필수 프로토콜인 경우 검증
      if (usProto.requiresFullBladder === true) {
        const bladderConfirmed = usPrep.fullBladderConfirmed;
        if (!isItemCleared(bladderConfirmed)) {
          return {
            isValid: false,
            clearanceStatus: '확인 필요',
            reason: '해당 초음파 검사는 방광 충만(소변 참기) 상태 확인이 필수입니다. (미확인/추가 확인 필요)',
            checklist,
          };
        }
      }

      // 3. 기타 사전 준비 필수 프로토콜인 경우 검증
      if (usProto.requiresOtherPreparation === true) {
        const otherConfirmed = usPrep.otherPreparationConfirmed;
        if (!isItemCleared(otherConfirmed)) {
          return {
            isValid: false,
            clearanceStatus: '확인 필요',
            reason: `${usProto.otherPreparationDescription || '초음파 사전 준비사항'} 확인이 완료되지 않았습니다.`,
            checklist,
          };
        }
      }
    }

    return {
      isValid: true,
      clearanceStatus: '검사 가능',
      checklist,
    };
  } catch (error: any) {
    // Fail-closed: Log internal Firebase error for developers, return safe generic message to UI
    console.error('[examService] validateExamChecklist error (fail-closed):', error);
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: '안전 점검 시스템 응답 오류로 검사가 보류되었습니다. 전산 상태를 확인해 주세요.',
    };
  }
}

/**
 * 1. startExam: 대기 -> 검사중
 * - CT/MRI는 어떤 옵션으로도 안전 체크리스트 검증을 우회할 수 없음 (무조건 강제).
 * - 일반 검사(X-ray, US, MG 등)는 즉시 통과.
 * - Firestore 원본 에러는 숨기고 안전한 일반 메시지만 반환.
 */
export async function startExam(
  examId: string,
  radiographerId?: string,
  radiographerName?: string
): Promise<{ success: boolean; error?: string; clearanceStatus?: ChecklistOverallStatus }> {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: '시스템 서비스가 연결되지 않았습니다.' };
  }

  try {
    const resolved = await resolveExamDocRef(examId);
    if (!resolved) {
      return { success: false, error: '해당 검사를 찾을 수 없습니다.' };
    }

    const { docRef, currentData } = resolved;
    const currentStatus = currentData.status;

    // Strict state transition guard
    if (currentStatus !== '대기') {
      return {
        success: false,
        error: `잘못된 상태 전환입니다. '대기' 상태의 검사만 '검사중'으로 변경할 수 있습니다. (현재 상태: ${currentStatus})`,
      };
    }

    // CT/MRI/수술실 C-arm/US: NO BYPASS - Always strictly validated according to protocol
    const isOrCarm =
      currentData.modality === 'C-arm' &&
      (currentData.equipmentId?.includes('수술실') || currentData.equipmentId === 'C-arm · 수술실');
    const isUS = currentData.modality === 'US' || currentData.modality === 'Ultrasound';

    if (['CT', 'MRI'].includes(currentData.modality) || isOrCarm || isUS) {
      const checkResult = await validateExamChecklist(examId, currentData.modality, currentData.equipmentId);
      if (!checkResult.isValid) {
        return {
          success: false,
          clearanceStatus: checkResult.clearanceStatus,
          error: `[안전 확인 필요 - ${checkResult.clearanceStatus}] ${checkResult.reason}`,
        };
      }
    }

    const updatePayload: Record<string, any> = {
      status: '검사중',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (radiographerId) updatePayload.radiographerId = radiographerId;
    if (radiographerName) updatePayload.radiographerName = radiographerName;

    await updateDoc(docRef, updatePayload);
    return { success: true, clearanceStatus: '검사 가능' };
  } catch (error: any) {
    console.error('[examService] startExam failed:', error);
    return { success: false, error: '검사 시작 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

/**
 * 2. completeExam: 검사중 -> 완료
 * - Disallow transition if current status is not '검사중' (Blocks 대기 -> 완료, 완료 -> 완료)
 * - Record completedAt using serverTimestamp
 * - Set interpretationStatus to '판독대기'
 * - Hide raw Firestore errors from UI
 */
export async function completeExam(
  examId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: '시스템 서비스가 연결되지 않았습니다.' };
  }

  try {
    const resolved = await resolveExamDocRef(examId);
    if (!resolved) {
      return { success: false, error: '해당 검사를 찾을 수 없습니다.' };
    }

    const { docRef, currentData } = resolved;
    const currentStatus = currentData.status;

    // Strict state transition guard
    if (currentStatus !== '검사중') {
      return {
        success: false,
        error: `잘못된 상태 전환입니다. '검사중' 상태의 검사만 '완료'로 변경할 수 있습니다. (현재 상태: ${currentStatus})`,
      };
    }

    const updatePayload: Record<string, any> = {
      status: '완료',
      interpretationStatus: '판독대기',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, updatePayload);
    return { success: true };
  } catch (error: any) {
    console.error('[examService] completeExam failed:', error);
    return { success: false, error: '검사 완료 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}
