import { supabase, isSupabaseConfigured } from '../client';
import { Patient } from '../types';

export async function getPatients(): Promise<Patient[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[patientService] getPatients error:', error.message);
      return [];
    }

    return (data as Patient[]) || [];
  } catch (error) {
    console.error('[patientService] unexpected error in getPatients:', error);
    return [];
  }
}

export async function getPatientById(id: string): Promise<Patient | null> {
  if (!isSupabaseConfigured || !supabase || !id) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[patientService] getPatientById (${id}) error:`, error.message);
      return null;
    }

    return (data as Patient) || null;
  } catch (error) {
    console.error(`[patientService] unexpected error in getPatientById (${id}):`, error);
    return null;
  }
}
