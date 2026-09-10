import { supabase, isSupabaseConfigured } from '../client';

export type PacsStudyLink = {
  exam_id: string;
  study_instance_uid: string;
  orthanc_study_id: string;
  modality: string | null;
  data_source: 'real_public' | 'synthetic_demo';
};

export async function getPacsStudyLinkByExamId(examId: string): Promise<{ data: PacsStudyLink | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase 클라이언트가 설정되지 않았습니다.') };
  const { data, error } = await supabase.from('pacs_study_links')
    .select('exam_id, study_instance_uid, orthanc_study_id, modality, data_source')
    .eq('exam_id', examId).maybeSingle();
  return { data: (data as PacsStudyLink | null) ?? null, error: error ? new Error(error.message) : null };
}
