import { supabase, isSupabaseConfigured } from '../client';
import { Reservation } from '../types';

export interface ReservationQueryFilter {
  date?: string;
  patient_query?: string;
  modality?: string;
  equipment_id?: string;
}

/**
 * 전체 또는 필터링된 예약 목록 조회
 */
export async function getReservations(
  filters?: ReservationQueryFilter
): Promise<{ data: Reservation[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[reservationService] getReservations:', err.message);
    return { data: null, error: err };
  }

  try {
    let query = supabase
      .from('reservations')
      .select('*')
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    if (filters?.date) {
      query = query.eq('reservation_date', filters.date);
    }
    if (filters?.modality && filters.modality !== '전체 Modality' && filters.modality !== '전체') {
      query = query.eq('modality', filters.modality);
    }
    if (filters?.equipment_id && filters.equipment_id !== '전체 장비' && filters.equipment_id !== '전체') {
      query = query.eq('equipment_id', filters.equipment_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[reservationService] getReservations DB error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    let results = (data as Reservation[]) || [];

    if (filters?.patient_query && filters.patient_query.trim()) {
      const q = filters.patient_query.trim().toLowerCase();
      results = results.filter((r) => {
        const idMatch = r.patient_id ? r.patient_id.toLowerCase().includes(q) : false;
        const nameMatch = r.patient_name ? r.patient_name.toLowerCase().includes(q) : false;
        const resIdMatch = r.id ? r.id.toLowerCase().includes(q) : false;
        return idMatch || nameMatch || resIdMatch;
      });
    }

    return { data: results, error: null };
  } catch (error: any) {
    console.error('[reservationService] getReservations exception:', error);
    return {
      data: null,
      error: new Error(error?.message || '예약 목록 조회 중 예외가 발생했습니다.'),
    };
  }
}

/**
 * 예약 ID로 단일 예약 상세 조회
 */
export async function getReservationById(
  id: string
): Promise<{ data: Reservation | null; error: Error | null }> {
  if (!id) {
    return { data: null, error: new Error('예약 ID가 제공되지 않았습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[reservationService] getReservationById (${id}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Reservation) || null, error: null };
  } catch (error: any) {
    console.error(`[reservationService] getReservationById exception:`, error);
    return {
      data: null,
      error: new Error(error?.message || '예약 상세 조회 중 예외가 발생했습니다.'),
    };
  }
}
