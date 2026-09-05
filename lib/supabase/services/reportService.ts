import { supabase, isSupabaseConfigured } from '../client';
import { Report, Exam, InterpretationStatus } from '../types';

/**
 * 전체 판독문 목록 조회
 */
export async function getReports(): Promise<{ data: Report[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[reportService] getReports:', err.message);
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[reportService] getReports error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Report[]) || [], error: null };
  } catch (error: any) {
    console.error('[reportService] getReports exception:', error);
    return { data: null, error: new Error(error?.message || '판독문 목록 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 특정 검사 ID(examId)에 연계된 판독문 조회
 */
export async function getReportByExam(
  examId: string
): Promise<{ data: Report | null; error: Error | null }> {
  if (!examId) {
    return { data: null, error: new Error('검사 ID가 제공되지 않았습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) {
      console.error(`[reportService] getReportByExam (${examId}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Report) || null, error: null };
  } catch (error: any) {
    console.error(`[reportService] getReportByExam exception:`, error);
    return { data: null, error: new Error(error?.message || '판독문 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 판독 대기 큐 (Reading Queue) 조회
 * - 검사가 '완료'되고 interpretation_status가 '판독대기'인 검사 목록을 반환
 * - 판독 우선순위 및 접수일시 순 정렬
 */
export async function getReadingQueue(): Promise<{ data: Exam[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('status', '완료')
      .eq('interpretation_status', '판독대기')
      .order('order_date', { ascending: true });

    if (error) {
      console.error('[reportService] getReadingQueue error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Exam[]) || [], error: null };
  } catch (error: any) {
    console.error('[reportService] getReadingQueue exception:', error);
    return { data: null, error: new Error(error?.message || '판독 큐 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 판독문 저장 (임시저장/작성중 또는 판독완료)
 * - reports 테이블 upsert (exam_id 기준)
 * - exams 테이블의 interpretation_status 동기화 ('판독중' 또는 '판독완료')
 */
export async function saveReport(params: {
  examId: string;
  findings: string;
  conclusion?: string | null;
  status: '판독중' | '판독완료';
  radiologistId?: string | null;
  radiologistName?: string | null;
}): Promise<{ data: Report | null; error: Error | null }> {
  const { examId, findings, conclusion, status, radiologistId, radiologistName } = params;
  if (!examId) {
    return { data: null, error: new Error('검사 ID(examId)가 필요합니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    // 1. 기존 리포트 확인
    const { data: existingReport, error: searchError } = await supabase
      .from('reports')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (searchError) {
      console.error(`[reportService] saveReport search error:`, searchError.message);
    }

    const now = new Date().toISOString();
    let savedReport: Report | null = null;

    if (existingReport?.id) {
      const { data, error } = await supabase
        .from('reports')
        .update({
          findings,
          conclusion: conclusion ?? existingReport.conclusion ?? null,
          status,
          radiologist_id: radiologistId ?? existingReport.radiologist_id ?? null,
          radiologist_name: radiologistName ?? existingReport.radiologist_name ?? null,
          updated_at: now,
        })
        .eq('id', existingReport.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error(`[reportService] update report error:`, error.message);
        return { data: null, error: new Error(error.message) };
      }
      savedReport = (data as Report) || null;
    } else {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          exam_id: examId,
          findings,
          conclusion: conclusion ?? null,
          status,
          radiologist_id: radiologistId ?? null,
          radiologist_name: radiologistName ?? null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error(`[reportService] insert report error:`, error.message);
        return { data: null, error: new Error(error.message) };
      }
      savedReport = (data as Report) || null;
    }

    // 2. exams 테이블의 interpretation_status 동기화
    const { error: examUpdateErr } = await supabase
      .from('exams')
      .update({
        interpretation_status: status as InterpretationStatus,
        updated_at: now,
      })
      .eq('id', examId);

    if (examUpdateErr) {
      console.error(`[reportService] update exam interpretation_status error:`, examUpdateErr.message);
    }

    return { data: savedReport, error: null };
  } catch (error: any) {
    console.error(`[reportService] saveReport exception:`, error);
    return { data: null, error: new Error(error?.message || '판독문 저장 중 예외가 발생했습니다.') };
  }
}
