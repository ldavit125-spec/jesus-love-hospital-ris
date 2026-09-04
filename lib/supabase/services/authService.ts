import { supabase, isSupabaseConfigured } from '../client';

export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('[authService] getCurrentUser error:', error);
    return null;
  }
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase가 설정되지 않았습니다.' };
  }
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '로그아웃 오류' };
  }
}
