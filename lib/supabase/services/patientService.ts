import { supabase, isSupabaseConfigured } from '../client';
import { Patient } from '../types';

export interface PatientWithCalculatedAge extends Patient {
  calculated_age: number;
}

/**
 * birth_date (YYYY-MM-DD) 기준 만 나이 계산 공통 함수
 * - 시스템 기준일: 현재(또는 지정일자)
 * - age 컬럼을 별도로 신뢰하지 않고 birth_date를 단일 진실 공급원으로 계산
 */
export function calculateAgeFromBirthDate(
  birthDate?: string | null,
  referenceDate: Date = new Date('2026-08-29')
): number {
  if (!birthDate) return 0;
  const [bYear, bMonth, bDay] = birthDate.split('-').map(Number);
  if (!bYear || !bMonth || !bDay) return 0;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let age = refYear - bYear;
  if (refMonth < bMonth || (refMonth === bMonth && refDay < bDay)) {
    age--;
  }
  return age >= 0 ? age : 0;
}

export function attachCalculatedAge(patient: Patient): PatientWithCalculatedAge {
  return {
    ...patient,
    calculated_age: calculateAgeFromBirthDate(patient.birth_date),
  };
}

/**
 * 전체 환자 목록 조회
 */
export async function getPatients(): Promise<{ data: PatientWithCalculatedAge[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[patientService] getPatients:', err.message);
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[patientService] getPatients DB error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    const patients = (data as Patient[]).map(attachCalculatedAge);
    return { data: patients, error: null };
  } catch (error: any) {
    console.error('[patientService] getPatients unexpected exception:', error);
    return { data: null, error: new Error(error?.message || '환자 목록 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 환자 ID(환자번호)로 단일 환자 조회
 */
export async function getPatientById(
  id: string
): Promise<{ data: PatientWithCalculatedAge | null; error: Error | null }> {
  if (!id) {
    return { data: null, error: new Error('환자 ID가 제공되지 않았습니다.') };
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[patientService] getPatientById:', err.message);
    return { data: null, error: err };
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[patientService] getPatientById (${id}) error:`, error.message);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: null };
    }

    return { data: attachCalculatedAge(data as Patient), error: null };
  } catch (error: any) {
    console.error(`[patientService] getPatientById (${id}) exception:`, error);
    return { data: null, error: new Error(error?.message || '환자 조회 중 예외가 발생했습니다.') };
  }
}

/**
 * 환자 검색 (환자번호, 환자명, 전화번호)
 * - keyword 일치 검색
 */
export async function searchPatients(
  keyword: string
): Promise<{ data: PatientWithCalculatedAge[] | null; error: Error | null }> {
  if (!keyword || !keyword.trim()) {
    return getPatients();
  }
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    console.error('[patientService] searchPatients:', err.message);
    return { data: null, error: err };
  }

  try {
    const trimmed = keyword.trim();
    // ilike로 환자번호(id), 환자명(name), 전화번호(phone) 검색
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`id.ilike.%${trimmed}%,name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
      .order('name', { ascending: true });

    if (error) {
      console.error('[patientService] searchPatients error:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    const patients = (data as Patient[]).map(attachCalculatedAge);
    return { data: patients, error: null };
  } catch (error: any) {
    console.error('[patientService] searchPatients exception:', error);
    return { data: null, error: new Error(error?.message || '환자 검색 중 예외가 발생했습니다.') };
  }
}
