import { supabase, isSupabaseConfigured } from '../client';
import { Equipment } from '../types';

// 예수사랑병원 RIS 확정 10대 장비 ID 마스터
export const CANONICAL_EQUIPMENT_IDS = [
  'X-ray 1',
  'X-ray 2',
  '건강검진 X-ray',
  'CT-01',
  'MR-01',
  'US-01',
  'MG-01',
  '수술실 C-arm',
  '투시실 C-arm',
  'Portable X-ray',
] as const;

// 검사 배정/시작 불가 장비 상태 정의
export const NON_OPERATIONAL_STATUSES = ['고장', '점검중', '사용중지'] as const;

/**
 * 장비의 검사 배정/가동 가능 여부 판정 공통 함수
 * - 고장, 점검중, 사용중지 상태는 검사 시작 및 배정 불가
 */
export async function isEquipmentOperational(
  equipmentId: string
): Promise<{ operational: boolean; status?: string; reason?: string }> {
  if (!equipmentId) {
    return { operational: false, reason: '장비 ID가 지정되지 않았습니다.' };
  }

  const { data: equip, error } = await getEquipmentById(equipmentId);
  if (error || !equip) {
    return {
      operational: false,
      reason: `장비 [${equipmentId}] 정보를 조회할 수 없습니다 (${error?.message || '장비 없음'}).`,
    };
  }

  const isBlocked = (NON_OPERATIONAL_STATUSES as readonly string[]).includes(equip.status);
  if (isBlocked) {
    return {
      operational: false,
      status: equip.status,
      reason: `장비 [${equip.name || equip.id}]가 현재 '${equip.status}' 상태이므로 검사를 배정하거나 시작할 수 없습니다.`,
    };
  }

  return { operational: true, status: equip.status };
}

/**
 * 전체 장비 목록 조회
 */
export async function getEquipment(): Promise<{ data: Equipment[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[equipmentService] getEquipment:', err.message);
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[equipmentService] getEquipment error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Equipment[]) || [], error: null };
  } catch (error: any) {
    console.error('[equipmentService] unexpected error in getEquipment:', error);
    return { data: null, error: new Error(error?.message || '장비 목록 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 장비 ID로 단일 장비 조회
 */
export async function getEquipmentById(
  id: string
): Promise<{ data: Equipment | null; error: Error | null }> {
  if (!id) {
    return { data: null, error: new Error('장비 ID가 제공되지 않았습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[equipmentService] getEquipmentById (${id}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Equipment) || null, error: null };
  } catch (error: any) {
    console.error(`[equipmentService] unexpected error in getEquipmentById (${id}):`, error);
    return { data: null, error: new Error(error?.message || '장비 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 장비 운영 상태 변경 (정상, 점검예정, 사용중, 고장, 점검중, 사용중지 등)
 */
export async function updateEquipmentStatus(
  id: string,
  status: string
): Promise<{ data: Equipment | null; error: Error | null }> {
  if (!id || !status) {
    return { data: null, error: new Error('장비 ID 및 변경할 상태가 유효하지 않습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('equipment')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error(`[equipmentService] updateEquipmentStatus (${id} -> ${status}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Equipment) || null, error: null };
  } catch (error: any) {
    console.error(`[equipmentService] unexpected error in updateEquipmentStatus (${id}):`, error);
    return { data: null, error: new Error(error?.message || '장비 상태 변경 중 예외가 발생했습니다.') };
  }
}
