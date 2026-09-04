import { supabase, isSupabaseConfigured } from '../client';

export interface Equipment {
  id: string;
  name: string;
  modality: string;
  room_name?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export async function getEquipment(): Promise<Equipment[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[equipmentService] getEquipment error:', error.message);
      return [];
    }

    return (data as Equipment[]) || [];
  } catch (error) {
    console.error('[equipmentService] unexpected error in getEquipment:', error);
    return [];
  }
}
