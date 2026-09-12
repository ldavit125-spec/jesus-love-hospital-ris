import { supabase, isSupabaseConfigured } from '../client';
import { Protocol } from '../types';

const protocolColumns =
  'id, code, name, modality, body_part, projection_view, description, preparation';

function unavailable(): Error {
  return new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
}

/** 등록된 촬영 프로토콜을 코드 순서로 조회한다. */
export async function getProtocols(): Promise<{
  data: Protocol[] | null;
  error: Error | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    const error = unavailable();
    console.error('[protocolService] getProtocols:', error.message);
    return { data: null, error };
  }

  try {
    const { data, error } = await supabase
      .from('protocols')
      .select(protocolColumns)
      .order('code', { ascending: true });

    if (error) {
      console.error('[protocolService] getProtocols DB error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Protocol[]) || [], error: null };
  } catch (error: any) {
    console.error('[protocolService] getProtocols exception:', error);
    return {
      data: null,
      error: new Error(error?.message || '촬영 프로토콜 조회 중 예외가 발생했습니다.'),
    };
  }
}

/** 프로토콜 코드로 단일 프로토콜을 조회한다. */
export async function getProtocolByCode(
  code: string
): Promise<{ data: Protocol | null; error: Error | null }> {
  if (!code) return { data: null, error: new Error('프로토콜 코드가 제공되지 않았습니다.') };
  if (!isSupabaseConfigured || !supabase) {
    const error = unavailable();
    console.error('[protocolService] getProtocolByCode:', error.message);
    return { data: null, error };
  }

  try {
    const { data, error } = await supabase
      .from('protocols')
      .select(protocolColumns)
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('[protocolService] getProtocolByCode DB error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Protocol) || null, error: null };
  } catch (error: any) {
    console.error('[protocolService] getProtocolByCode exception:', error);
    return {
      data: null,
      error: new Error(error?.message || '프로토콜 코드 조회 중 예외가 발생했습니다.'),
    };
  }
}

/** 프로토콜 ID로 단일 프로토콜을 조회한다. */
export async function getProtocolById(
  id: string
): Promise<{ data: Protocol | null; error: Error | null }> {
  if (!id) return { data: null, error: new Error('프로토콜 ID가 제공되지 않았습니다.') };
  if (!isSupabaseConfigured || !supabase) {
    const error = unavailable();
    console.error('[protocolService] getProtocolById:', error.message);
    return { data: null, error };
  }

  try {
    const { data, error } = await supabase
      .from('protocols')
      .select(protocolColumns)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[protocolService] getProtocolById DB error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as Protocol) || null, error: null };
  } catch (error: any) {
    console.error('[protocolService] getProtocolById exception:', error);
    return {
      data: null,
      error: new Error(error?.message || '프로토콜 ID 조회 중 예외가 발생했습니다.'),
    };
  }
}
