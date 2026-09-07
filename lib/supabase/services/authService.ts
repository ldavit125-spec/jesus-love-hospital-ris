import { supabase, isSupabaseConfigured } from '../client';
import { AppRole, Profile } from '../types';

export type UserRole = AppRole | '방사선사' | '전문의' | '관리자';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  department: string;
  initial: string;
}

/**
 * 역할 한글/영문 정규화
 * - 'rt' / 'radiologist' / 'admin' (또는 '방사선사', '전문의', '관리자')만 허용
 * - 알 수 없거나 없는 역할은 null을 반환하여 절대 admin으로 fail-open 처리하지 않음
 */
export function normalizeRole(rawRole?: string | null): AppRole | null {
  if (!rawRole) return null;
  const r = rawRole.toLowerCase().trim();
  if (r === 'rt' || r === '방사선사') return 'rt';
  if (r === 'radiologist' || r === '전문의') return 'radiologist';
  if (r === 'admin' || r === '관리자') return 'admin';
  return null;
}

export function roleDisplayLabel(role: AppRole): string {
  switch (role) {
    case 'rt':
      return '방사선사';
    case 'radiologist':
      return '영상의학과 전문의';
    case 'admin':
      return '관리자';
    default:
      return '사용자';
  }
}

/**
 * 실제 Supabase Auth email/password 로그인
 * - 인증 실패 시 임의 세션 생성 금지 (에러 반환)
 * - public.profiles 테이블에 유효한 role('rt' | 'radiologist' | 'admin')이 없으면 즉시 실패 처리
 */
export async function signInWithEmailPassword(
  identifier: string,
  password: string
): Promise<{ profile: UserProfile | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      profile: null,
      error: new Error('Supabase 클라이언트가 설정되지 않았습니다.'),
    };
  }

  // 아이디가 이메일 형태가 아니면 기본 도메인 자동 부착 (예: admin1 -> admin1@jesuslove.hospital)
  let email = identifier.trim();
  if (!email.includes('@')) {
    email = `${email}@jesuslove.hospital`;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return {
        profile: null,
        error: new Error(error?.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'),
      };
    }

    // public.profiles 테이블에서 사용자 이름 및 역할 조회
    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileErr) {
      await supabase.auth.signOut();
      return {
        profile: null,
        error: new Error(`프로필 조회 중 오류가 발생했습니다: ${profileErr.message}`),
      };
    }

    if (!profileRow) {
      await supabase.auth.signOut();
      return {
        profile: null,
        error: new Error('권한 프로필이 등록되지 않은 사용자입니다. 관리자에게 문의하세요.'),
      };
    }

    const appRole = normalizeRole(profileRow.role);
    if (!appRole) {
      await supabase.auth.signOut();
      return {
        profile: null,
        error: new Error(`유효하지 않은 시스템 권한(${profileRow.role || '미지정'})입니다. 로그인할 수 없습니다.`),
      };
    }

    const name = profileRow.name?.trim() || data.user.user_metadata?.name?.trim() || (
      appRole === 'rt' ? '방사선사' : appRole === 'radiologist' ? '영상의학과 전문의' : '관리자'
    );

    const profile: UserProfile = {
      id: data.user.id,
      email: data.user.email || email,
      name,
      role: appRole,
      department: appRole === 'admin' ? '의료정보팀 / 관리운영' : appRole === 'radiologist' ? '영상의학과 판독실' : '영상의학팀',
      initial: name.charAt(0) || (appRole === 'rt' ? '이' : appRole === 'radiologist' ? '장' : '관'),
    };

    return { profile, error: null };
  } catch (err: any) {
    return {
      profile: null,
      error: new Error(err?.message || '로그인 처리 중 예외가 발생했습니다.'),
    };
  }
}

/**
 * 현재 세션 사용자 조회
 * - 실제 Supabase Auth 세션이 있을 때만 profiles 조회 후 반환
 * - profiles가 없거나 role이 유효하지 않으면 null 반환 (fail-closed)
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }

    // public.profiles에서 정보 조회
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileRow) {
      return null;
    }

    const appRole = normalizeRole(profileRow.role);
    if (!appRole) {
      return null;
    }

    const name = profileRow.name?.trim() || user.user_metadata?.name?.trim() || (
      appRole === 'rt' ? '방사선사' : appRole === 'radiologist' ? '영상의학과 전문의' : '관리자'
    );

    return {
      id: user.id,
      email: user.email || '',
      name,
      role: appRole,
      department: appRole === 'admin' ? '의료정보팀 / 관리운영' : appRole === 'radiologist' ? '영상의학과 판독실' : '영상의학팀',
      initial: name.charAt(0) || (appRole === 'rt' ? '이' : appRole === 'radiologist' ? '장' : '관'),
    };
  } catch (err) {
    console.error('[authService] getCurrentUser error:', err);
    return null;
  }
}

/**
 * 실제 Supabase Auth 로그아웃
 */
export async function signOut(): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || '로그아웃 중 오류가 발생했습니다.' };
  }
}

/**
 * 역할별 기능 권한 검사 헬퍼
 */
export const permissions = {
  canStartCompleteExam: (role?: AppRole): boolean => role === 'rt' || role === 'admin',
  canWriteReport: (role?: AppRole): boolean => role === 'radiologist' || role === 'admin',
  canManageEquipment: (role?: AppRole): boolean => role === 'admin',
  canManageSchedule: (role?: AppRole): boolean => role === 'admin',
  canSaveSettings: (role?: AppRole): boolean => role === 'admin',
};
