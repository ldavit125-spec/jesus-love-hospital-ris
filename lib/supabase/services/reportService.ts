import { supabase, isSupabaseConfigured } from '../client';
import { Report, Exam } from '../types';

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
