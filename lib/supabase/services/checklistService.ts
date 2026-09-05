import { supabase, isSupabaseConfigured } from '../client';
import {
  ExamChecklist,
  ChecklistOverallStatus,
  ChecklistItemStatus,
} from '../types';

function isItemCleared(status?: ChecklistItemStatus): boolean {
  return status === '확인 완료' || status === '해당 없음';
}

/**
 * 특정 검사의 사전 안전 체크리스트 조회
 */
export async function getExamChecklist(
  examId: string
): Promise<{ data: ExamChecklist | null; error: Error | null }> {
  if (!examId) {
    return { data: null, error: new Error('검사 ID가 제공되지 않았습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('exam_checklists')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) {
      console.error(`[checklistService] getExamChecklist (${examId}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as ExamChecklist) || null, error: null };
  } catch (error: any) {
    console.error(`[checklistService] getExamChecklist exception:`, error);
    return { data: null, error: new Error(error?.message || '체크리스트 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 사전 안전 체크리스트 저장 (등록 또는 업데이트)
 */
export async function saveExamChecklist(
  checklist: Partial<ExamChecklist> & { exam_id: string; overall_status: ChecklistOverallStatus }
): Promise<{ data: ExamChecklist | null; error: Error | null }> {
  if (!checklist?.exam_id) {
    return { data: null, error: new Error('체크리스트 저장을 위한 검사 ID(exam_id)가 없습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const payload = {
      ...checklist,
      updated_at: new Date().toISOString(),
    };

    // 기존 데이터 존재 여부 확인
    const { data: existing } = await supabase
      .from('exam_checklists')
      .select('id')
      .eq('exam_id', checklist.exam_id)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('exam_checklists')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error(`[checklistService] updateExamChecklist error:`, error.message);
        return { data: null, error: new Error(error.message) };
      }
      return { data: (data as ExamChecklist) || null, error: null };
    } else {
      const { data, error } = await supabase
        .from('exam_checklists')
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        console.error(`[checklistService] insertExamChecklist error:`, error.message);
        return { data: null, error: new Error(error.message) };
      }
      return { data: (data as ExamChecklist) || null, error: null };
    }
  } catch (error: any) {
    console.error(`[checklistService] saveExamChecklist exception:`, error);
    return { data: null, error: new Error(error?.message || '체크리스트 저장 중 예외가 발생했습니다.') };
  }
}

/**
 * CT/MRI/OR C-arm/US Fail-Closed Safety Validator
 *
 * 엄격한 환자 안전 수칙:
 * 1. CT, MRI 검사는 Fail-Closed 원칙 적용:
 *    - 체크리스트 미등록 -> 절대 시작 불가 (검사 보류)
 *    - DB 조회 오류 -> 절대 시작 불가 (검사 보류)
 *    - 필수 확인 항목 미확인 / 추가 확인 필요 -> 절대 시작 불가 (확인 필요)
 *    - MR Conditional 호환성 조건 미검증 -> 절대 시작 불가 (검사 보류)
 * 2. 응급 검사라 하더라도 환자 생명 안전과 직결되므로 safety bypass 금지
 * 3. 수술실 C-arm: 금식 및 집도의 구두 확인 미완료 시 시작 불가
 * 4. 초음파(US): 복부/골반 등 프로토콜별 금식/방광충만 확인 미완료 시 시작 불가
 * 5. 일반 X-ray: 안전 점검 대상 외로 자동 통과
 */
export async function validateExamStart(
  examId: string,
  modality: string,
  equipmentId?: string
): Promise<{
  isValid: boolean;
  clearanceStatus: ChecklistOverallStatus;
  reason?: string;
  checklist?: ExamChecklist | null;
}> {
  const isOrCarm =
    modality === 'C-arm' &&
    (equipmentId?.includes('수술실') || equipmentId === 'C-arm · 수술실' || equipmentId === '수술실 C-arm');
  const isUS = modality === 'US' || modality === 'Ultrasound';

  // 1. 일반촬영 등 비고위험 검사는 자동 통과
  if (!['CT', 'MRI'].includes(modality) && !isOrCarm && !isUS) {
    return { isValid: true, clearanceStatus: '검사 가능' };
  }

  // 2. Fail-Closed: Supabase 미연결 또는 비정상 상태일 경우 무조건 차단
  if (!isSupabaseConfigured || !supabase) {
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: '안전 점검 데이터베이스에 연결할 수 없어 환자 안전을 위해 검사를 시작할 수 없습니다 (Fail-Closed).',
    };
  }

  // 3. 체크리스트 조회
  const { data: checklist, error } = await getExamChecklist(examId);

  // DB 에러 시 무조건 차단
  if (error) {
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: `체크리스트 조회 중 오류가 발생하여 검사가 보류되었습니다: ${error.message}`,
    };
  }

  // 체크리스트가 존재하지 않는 경우 차단 (US의 경우 별도 프로토콜 없을 시 허용)
  if (!checklist) {
    if (isUS) {
      return { isValid: true, clearanceStatus: '검사 가능' };
    }
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: `[${modality}] 환자 안전 체크리스트가 등록되지 않았습니다. 체크리스트 확인을 먼저 완료해 주세요. (응급 bypass 불가)`,
    };
  }

  // 명시적 '검사 보류' 판정 시 차단
  if (checklist.overall_status === '검사 보류') {
    return {
      isValid: false,
      clearanceStatus: '검사 보류',
      reason: '체크리스트 종합 판정이 [검사 보류] 상태입니다. 의료진의 안전 확인이 완료되어야 합니다.',
      checklist,
    };
  }

  // 4. CT 안전성 정밀 검증
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

  // 5. MRI 안전성 정밀 검증 (체내 금속물/전자기기 철저 검증)
  if (modality === 'MRI') {
    if (!isItemCleared(checklist.pregnancy_risk)) {
      return { isValid: false, clearanceStatus: '확인 필요', reason: '임신 가능성 확인이 완료되지 않았습니다.', checklist };
    }
    if (checklist.pacemaker_or_electronics === '확인 완료') {
      const mrStatus = checklist.pacemaker_mr_status;
      if (!mrStatus || mrStatus === '미확인' || mrStatus === 'MR Unsafe') {
        return {
          isValid: false,
          clearanceStatus: '검사 보류',
          reason: '체내 전자기기의 MR 안전성(MR Conditional 등)이 검증되지 않았거나 위험합니다. (검사 보류)',
          checklist,
        };
      }
    } else if (!isItemCleared(checklist.pacemaker_or_electronics)) {
      return {
        isValid: false,
        clearanceStatus: '검사 보류',
        reason: '심박동기 및 체내 전자기기 유무 확인이 완료되지 않았습니다.',
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

  // 6. 수술실 C-arm 금식 및 집도의 구두 확인 검증
  if (isOrCarm) {
    const orSafety = checklist.or_carm_safety;
    const fastingStatus = orSafety?.fastingStatus;
    if (!fastingStatus || fastingStatus === '미확인' || fastingStatus === '추가 확인 필요') {
      return {
        isValid: false,
        clearanceStatus: '확인 필요',
        reason: '수술실 C-arm 검사 전 금식 상태 확인이 완료되지 않았습니다.',
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

  // 7. 초음파(US) 프로토콜별 준비사항 검증
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
}
