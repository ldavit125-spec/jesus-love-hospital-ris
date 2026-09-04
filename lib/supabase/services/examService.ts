import { supabase, isSupabaseConfigured } from '../client';
import {
  Exam,
  ExamQueryFilter,
  ExamStatus,
} from '../types';
import { validateExamStart } from './checklistService';
import { isEquipmentOperational } from './equipmentService';

/**
 * 전체 검사 목록 조회 (필터 지원)
 */
export async function getExams(
  filters?: ExamQueryFilter
): Promise<{ data: Exam[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[examService] getExams:', err.message);
    return { data: null, error: err };
  }

  try {
    let query = supabase
      .from('exams')
      .select('*')
      .order('order_date', { ascending: false });

    if (filters?.status && filters.status !== '전체' && filters.status !== '전체 상태') {
      query = query.eq('status', filters.status);
    }
    if (filters?.modality && filters.modality !== '전체 Modality') {
      query = query.eq('modality', filters.modality);
    }
    if (filters?.equipment_id && filters.equipment_id !== '전체' && filters.equipment_id !== '전체 장비') {
      query = query.eq('equipment_id', filters.equipment_id);
    }
    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[examService] getExams DB error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Exam[]) || [], error: null };
  } catch (error: any) {
    console.error('[examService] getExams exception:', error);
    return { data: null, error: new Error(error?.message || '검사 목록 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 검사 ID(Accession No/Exam ID)로 단일 검사 조회
 */
export async function getExamById(
  id: string
): Promise<{ data: Exam | null; error: Error | null }> {
  if (!id) {
    return { data: null, error: new Error('검사 ID가 제공되지 않았습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[examService] getExamById:', err.message);
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[examService] getExamById (${id}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Exam) || null, error: null };
  } catch (error: any) {
    console.error(`[examService] getExamById (${id}) exception:`, error);
    return { data: null, error: new Error(error?.message || '검사 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 특정 환자의 검사 이력 조회
 */
export async function getExamsByPatient(
  patientId: string
): Promise<{ data: Exam[] | null; error: Error | null }> {
  if (!patientId) {
    return { data: null, error: new Error('환자 ID가 제공되지 않았습니다.') };
  }
  return getExams({ patient_id: patientId });
}

/**
 * 특정 장비에 배정된 검사 목록 조회
 */
export async function getExamsByEquipment(
  equipmentId: string
): Promise<{ data: Exam[] | null; error: Error | null }> {
  if (!equipmentId) {
    return { data: null, error: new Error('장비 ID가 제공되지 않았습니다.') };
  }
  return getExams({ equipment_id: equipmentId });
}

/**
 * 검사 상태 변경 (업무 흐름 및 역방향 차단 규칙 엄격 적용)
 *
 * 상태 흐름 규칙:
 * 1. '대기' -> '검사중' (시작)
 * 2. '검사중' -> '완료' (완료)
 * 3. 역방향 변경 금지: '완료' -> '검사중'/'대기' 불가, '검사중' -> '대기' 불가
 * 4. '완료' 시: interpretation_status = '판독대기' 자동 지정, completed_at 타임스탬프 기록
 * 5. '대기' / '검사중' 시: interpretation_status = NULL 보장
 */
export async function updateExamStatus(
  examId: string,
  newStatus: ExamStatus
): Promise<{ data: Exam | null; error: Error | null }> {
  if (!examId || !newStatus) {
    return { data: null, error: new Error('검사 ID 또는 변경할 상태가 유효하지 않습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  // 1. 현재 검사 상태 조회
  const { data: currentExam, error: fetchErr } = await getExamById(examId);
  if (fetchErr || !currentExam) {
    return { data: null, error: new Error(fetchErr?.message || '검사 정보를 찾을 수 없습니다.') };
  }

  const prevStatus = currentExam.status;

  // 동일 상태일 경우 패스
  if (prevStatus === newStatus) {
    return { data: currentExam, error: null };
  }

  // 2. 역방향 상태 변경 차단
  if (prevStatus === '완료') {
    return { data: null, error: new Error('이미 검사가 완료된 건은 상태를 되돌릴 수 없습니다.') };
  }
  if (prevStatus === '검사중' && newStatus === '대기') {
    return { data: null, error: new Error('이미 진행 중인 검사는 대기 상태로 역방향 변경할 수 없습니다.') };
  }

  // 3. 업데이트 필드 구성
  const updatePayload: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === '검사중') {
    updatePayload.interpretation_status = null;
    if (!currentExam.started_at) {
      updatePayload.started_at = new Date().toISOString();
    }
  } else if (newStatus === '완료') {
    updatePayload.interpretation_status = '판독대기';
    updatePayload.completed_at = new Date().toISOString();
  } else if (newStatus === '대기') {
    updatePayload.interpretation_status = null;
  }

  try {
    const { data, error } = await supabase
      .from('exams')
      .update(updatePayload)
      .eq('id', examId)
      .select()
      .maybeSingle();

    if (error) {
      console.error(`[examService] updateExamStatus (${examId} -> ${newStatus}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Exam) || null, error: null };
  } catch (error: any) {
    console.error(`[examService] updateExamStatus exception:`, error);
    return { data: null, error: new Error(error?.message || '검사 상태 업데이트 중 예외가 발생했습니다.') };
  }
}

/**
 * 검사 시작 (대기 -> 검사중)
 * - 안전성 체크리스트 (CT/MRI/OR C-arm/US) Fail-closed 사전 검증 통과 필수
 * - 배정 장비 가동 상태(고장/점검중/사용중지 여부) 사전 검증
 */
export async function startExam(
  examId: string
): Promise<{ data: Exam | null; error: Error | null }> {
  // 1. 현재 검사 확인
  const { data: exam, error: fetchErr } = await getExamById(examId);
  if (fetchErr || !exam) {
    return { data: null, error: new Error(fetchErr?.message || '검사 정보를 찾을 수 없습니다.') };
  }

  if (exam.status !== '대기') {
    return { data: null, error: new Error(`검사를 시작할 수 없는 상태입니다 (현재 상태: ${exam.status}).`) };
  }

  // 2. 장비 가동 가능 여부 체크
  if (exam.equipment_id) {
    const equipCheck = await isEquipmentOperational(exam.equipment_id);
    if (!equipCheck.operational) {
      return { data: null, error: new Error(equipCheck.reason || '배정된 장비가 가동 불가능 상태입니다.') };
    }
  }

  // 3. 안전 체크리스트 Fail-Closed 검증 (checklistService)
  const safetyCheck = await validateExamStart(exam.id, exam.modality, exam.equipment_id || undefined);
  if (!safetyCheck.isValid) {
    return {
      data: null,
      error: new Error(`[환자 안전 검증 보류] ${safetyCheck.reason || '안전 체크리스트 검증을 통과하지 못했습니다.'}`),
    };
  }

  // 4. 상태 변경
  return updateExamStatus(examId, '검사중');
}

/**
 * 검사 완료 (검사중 -> 완료)
 * - 완료 즉시 interpretation_status = '판독대기'로 자동 전이
 */
export async function completeExam(
  examId: string
): Promise<{ data: Exam | null; error: Error | null }> {
  const { data: exam, error: fetchErr } = await getExamById(examId);
  if (fetchErr || !exam) {
    return { data: null, error: new Error(fetchErr?.message || '검사 정보를 찾을 수 없습니다.') };
  }

  if (exam.status !== '검사중') {
    return { data: null, error: new Error(`진행 중인 검사만 완료 처리할 수 있습니다 (현재 상태: ${exam.status}).`) };
  }

  return updateExamStatus(examId, '완료');
}
