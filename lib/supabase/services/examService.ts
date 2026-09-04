import { supabase, isSupabaseConfigured } from '../client';
import {
  Exam,
  ExamQueryFilter,
  ExamChecklist,
  ChecklistOverallStatus,
  ChecklistItemStatus,
} from '../types';

export async function getExams(filters?: ExamQueryFilter): Promise<Exam[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('exams')
      .select('*')
      .order('order_date', { ascending: false });

    if (filters?.status && filters.status !== '전체') {
      query = query.eq('status', filters.status);
    }
    if (filters?.modality && filters.modality !== '전체 Modality') {
      query = query.eq('modality', filters.modality);
    }
    if (filters?.equipment_id && filters.equipment_id !== '전체') {
      query = query.eq('equipment_id', filters.equipment_id);
    }
    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[examService] getExams error:', error.message);
      return [];
    }

    return (data as Exam[]) || [];
  } catch (error) {
    console.error('[examService] unexpected error in getExams:', error);
    return [];
  }
}

export async function getExamById(id: string): Promise<Exam | null> {
  if (!isSupabaseConfigured || !supabase || !id) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[examService] getExamById (${id}) error:`, error.message);
      return null;
    }

    return (data as Exam) || null;
  } catch (error) {
    console.error(`[examService] unexpected error in getExamById (${id}):`, error);
    return null;
  }
}

function isItemCleared(status?: ChecklistItemStatus): boolean {
  return status === '확인 완료' || status === '해당 없음';
}

/**
 * CT/MRI Fail-Closed Safety Validator (Supabase Version)
 * - Non-CT/MRI exams pass automatically.
 * - CT/MRI exams MUST pass: missing doc, incomplete item, or DB error will ALWAYS block (fail-closed).
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
  const isOrCarm =
    modality === 'C-arm' &&
    (equipmentId?.includes('수술실') || equipmentId === 'C-arm · 수술실');
  const isUS = modality === 'US' || modality === 'Ultrasound';

  // 1. Non-CT/MRI/OR-C-arm/US modalities pass automatically
  if (!['CT', 'MRI'].includes(modality) && !isOrCarm && !isUS) {
    return { isValid: true, clearanceStatus: '검사 가능' };
  }

  // 2. Fail-closed: DB is inaccessible -> BLOCK
  if (!isSupabaseConfigured || !supabase) {
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: '시스템 안전 검증 모듈이 준비되지 않아 검사를 시작할 수 없습니다. (검사 보류)',
    };
  }

  try {
    const { data, error } = await supabase
      .from('exam_checklists')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) {
      console.error('[examService] validateExamChecklist DB error:', error.message);
      return {
        isValid: false,
        clearanceStatus: '검사 보류',
        reason: '안전 검증 모듈 연결 실패로 검사를 시작할 수 없습니다.',
      };
    }

    if (!data) {
      if (isUS) {
        return { isValid: true, clearanceStatus: '검사 가능' };
      }
      return {
        isValid: false,
        clearanceStatus: '검사 보류',
        reason: `${modality} 사전 안전 체크리스트가 등록되지 않았습니다. 체크리스트 확인을 먼저 완료해 주세요.`,
      };
    }

    const checklist = data as ExamChecklist;

    // Explicit Hold Check
    if (checklist.overall_status === '검사 보류') {
      return {
        isValid: false,
        clearanceStatus: '검사 보류',
        reason: '체크리스트 판정 상태가 [검사 보류]로 지정되어 있습니다.',
        checklist,
      };
    }

    // CT Safety Validation
    if (modality === 'CT') {
      if (!isItemCleared(checklist.pregnancy_risk)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '임신 가능성 확인이 완료되지 않았습니다.', checklist };
      }
      if (!isItemCleared(checklist.mobility_status)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '이동 및 검사 체위 유지 가능 여부가 확인되지 않았습니다.', checklist };
      }
      if (checklist.uses_contrast) {
        if (!isItemCleared(checklist.contrast_consent_confirmed)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '조영제 사용 동의서가 확인되지 않았습니다.', checklist };
        }
        if (!isItemCleared(checklist.contrast_allergy)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '조영제 알레르기 반응 이력 확인이 완료되지 않았습니다.', checklist };
        }
        if (!isItemCleared(checklist.kidney_function)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '신장기능(eGFR/Creatinine) 수치 확인이 완료되지 않았습니다.', checklist };
        }
        if (!isItemCleared(checklist.iv_access_confirmed)) {
          return { isValid: false, clearanceStatus: '확인 필요', reason: '정맥주사(IV) 혈관 라인 확보가 확인되지 않았습니다.', checklist };
        }
      }
    }

    // MRI Safety Validation
    if (modality === 'MRI') {
      if (!isItemCleared(checklist.pregnancy_risk)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '임신 가능성 확인이 완료되지 않았습니다.', checklist };
      }
      if (checklist.pacemaker_or_electronics === '확인 완료') {
        const mrStatus = checklist.pacemaker_mr_status;
        if (!mrStatus || mrStatus === '미확인') {
          return {
            isValid: false,
            clearanceStatus: '검사 보류',
            reason: '체내 전자기기의 MR 안전성 분류가 확인되지 않았습니다. (검사 보류)',
            checklist,
          };
        }
      } else if (!isItemCleared(checklist.pacemaker_or_electronics)) {
        return {
          isValid: false,
          clearanceStatus: '검사 보류',
          reason: '심박동기 및 체내 전자기기 확인이 완료되지 않았습니다.',
          checklist,
        };
      }

      if (checklist.metallic_implants === '확인 완료') {
        const implantStatus = checklist.implant_mr_status;
        if (!implantStatus || implantStatus === '미확인') {
          return {
            isValid: false,
            clearanceStatus: '확인 필요',
            reason: '체내 금속 보형물의 MR 안전성 분류(MR Safe / MR Conditional)가 확인되지 않았습니다.',
            checklist,
          };
        }
      } else if (!isItemCleared(checklist.metallic_implants)) {
        return {
          isValid: false,
          clearanceStatus: '확인 필요',
          reason: '금속성 보형물/삽입물 확인이 완료되지 않았습니다.',
          checklist,
        };
      }

      if (!isItemCleared(checklist.clips_coils_stents)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '수술용 클립/코일/스텐트 확인이 완료되지 않았습니다.', checklist };
      }
      if (!isItemCleared(checklist.foreign_metal_bodies)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '금속성 이물질 여부 확인이 완료되지 않았습니다.', checklist };
      }
      if (!isItemCleared(checklist.removable_metals_hearing_aids)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '보청기 및 체외 금속물질 탈거 확인이 완료되지 않았습니다.', checklist };
      }
      if (!isItemCleared(checklist.claustrophobia)) {
        return { isValid: false, clearanceStatus: '확인 필요', reason: '폐쇄공포증 여부 확인이 완료되지 않았습니다.', checklist };
      }
    }

    // Operating Room C-arm Safety Validation
    if (isOrCarm) {
      const orSafety = checklist.or_carm_safety;
      const fastingStatus = orSafety?.fastingStatus;
      if (!fastingStatus || fastingStatus === '미확인' || fastingStatus === '추가 확인 필요') {
        return {
          isValid: false,
          clearanceStatus: '확인 필요',
          reason: '수술실 C-arm 검사 전 금식 상태 확인이 완료되지 않았습니다. (추가 확인 필요)',
          checklist,
        };
      }
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

    // Ultrasound Protocol Preparation Validation
    if (isUS) {
      const usProto = checklist.us_protocol || {};
      const usPrep = checklist.us_preparation || {};
      if (usProto.requiresFasting === true && !isItemCleared(usPrep.fastingConfirmed)) {
        return {
          isValid: false,
          clearanceStatus: '확인 필요',
          reason: '해당 초음파 검사는 사전 금식(6~8시간) 확인이 필수입니다.',
          checklist,
        };
      }
      if (usProto.requiresFullBladder === true && !isItemCleared(usPrep.fullBladderConfirmed)) {
        return {
          isValid: false,
          clearanceStatus: '확인 필요',
          reason: '해당 초음파 검사는 방광 충만(소변 참기) 상태 확인이 필수입니다.',
          checklist,
        };
      }
    }

    return {
      isValid: true,
      clearanceStatus: '검사 가능',
      checklist,
    };
  } catch (error: any) {
    console.error('[examService] validateExamChecklist error (fail-closed):', error);
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: '안전 점검 시스템 응답 오류로 검사가 보류되었습니다. 전산 상태를 확인해 주세요.',
    };
  }
}
