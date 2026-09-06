import { supabase, isSupabaseConfigured } from '../client';
import { SystemSetting } from '../types';

/**
 * Supabase system_settings 전체 목록 조회
 */
export async function getSystemSettings(): Promise<{
  data: SystemSetting[] | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      console.error('[settingService] getSystemSettings error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as SystemSetting[]) || [], error: null };
  } catch (error: any) {
    console.error('[settingService] unexpected error in getSystemSettings:', error);
    return {
      data: null,
      error: new Error(error?.message || '시스템 설정 조회 중 예외가 발생했습니다.'),
    };
  }
}

/**
 * 단일 설정 키 조회
 */
export async function getSystemSettingByKey(
  key: string
): Promise<{ data: SystemSetting | null; error: Error | null }> {
  if (!key) {
    return { data: null, error: new Error('설정 키가 제공되지 않았습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error(`[settingService] getSystemSettingByKey (${key}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as SystemSetting) || null, error: null };
  } catch (error: any) {
    console.error(`[settingService] unexpected error in getSystemSettingByKey (${key}):`, error);
    return {
      data: null,
      error: new Error(error?.message || '설정 항목 조회 중 예외가 발생했습니다.'),
    };
  }
}

/**
 * 시스템 설정값 업데이트
 * - 추후 관리자 로그인/인증 토큰(JWT) 기반 RLS update 정책과 연동되도록 설계
 * - RLS 정책에 의해 0건 수정 또는 오류 발생 시 에러/상태 반환
 */
export async function updateSystemSetting(
  key: string,
  value: string
): Promise<{ data: SystemSetting | null; error: Error | null; success: boolean }> {
  if (!key) {
    return { data: null, error: new Error('설정 키가 유효하지 않습니다.'), success: false };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    return { data: null, error: err, success: false };
  }

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('system_settings')
      .update({
        value,
        updated_at: now,
      })
      .eq('key', key)
      .select()
      .maybeSingle();

    if (error) {
      console.error(`[settingService] updateSystemSetting (${key}) error:`, error.message);
      return { data: null, error: new Error(error.message), success: false };
    }

    return {
      data: (data as SystemSetting) || null,
      error: null,
      success: true,
    };
  } catch (error: any) {
    console.error(`[settingService] unexpected error in updateSystemSetting (${key}):`, error);
    return {
      data: null,
      error: new Error(error?.message || '시스템 설정 변경 중 예외가 발생했습니다.'),
      success: false,
    };
  }
}

/**
 * 여러 시스템 설정을 일괄 업데이트
 */
export async function updateMultipleSystemSettings(
  settings: Record<string, string>
): Promise<{ updated: string[]; failed: string[]; error: Error | null }> {
  const updated: string[] = [];
  const failed: string[] = [];

  for (const [key, value] of Object.entries(settings)) {
    const res = await updateSystemSetting(key, value);
    if (res.error || (!res.data && !res.success)) {
      failed.push(key);
    } else {
      updated.push(key);
    }
  }

  return {
    updated,
    failed,
    error: failed.length > 0 ? new Error(`${failed.join(', ')} 설정 저장 실패`) : null,
  };
}
