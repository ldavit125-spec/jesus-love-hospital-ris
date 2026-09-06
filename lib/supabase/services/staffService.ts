import { supabase, isSupabaseConfigured } from '../client';
import { Staff, WorkSchedule } from '../types';

export interface WorkScheduleQueryFilter {
  date?: string;
  equipment_id?: string;
}

/**
 * 방사선사 및 직원 목록 조회
 */
export async function getStaffList(
  role?: string
): Promise<{ data: Staff[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[staffService] getStaffList:', err.message);
    return { data: null, error: err };
  }

  try {
    let query = supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[staffService] getStaffList error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Staff[]) || [], error: null };
  } catch (error: any) {
    console.error('[staffService] unexpected error in getStaffList:', error);
    return {
      data: null,
      error: new Error(error?.message || '직원 목록 조회 중 예외가 발생했습니다.'),
    };
  }
}

/**
 * 근무 일정 및 장비 배정 현황 조회
 */
export async function getWorkSchedules(
  filters?: WorkScheduleQueryFilter
): Promise<{ data: WorkSchedule[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[staffService] getWorkSchedules:', err.message);
    return { data: null, error: err };
  }

  try {
    let query = supabase
      .from('work_schedules')
      .select('*')
      .order('created_at', { ascending: true });

    if (filters?.date) {
      query = query.eq('schedule_date', filters.date);
    }
    if (filters?.equipment_id && filters.equipment_id !== '전체 장비' && filters.equipment_id !== '전체') {
      query = query.eq('equipment_id', filters.equipment_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[staffService] getWorkSchedules error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as WorkSchedule[]) || [], error: null };
  } catch (error: any) {
    console.error('[staffService] unexpected error in getWorkSchedules:', error);
    return {
      data: null,
      error: new Error(error?.message || '근무 일정 조회 중 예외가 발생했습니다.'),
    };
  }
}
