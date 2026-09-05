'use client';
import {
  Activity,
  AlertTriangle,
  Ban,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  ListFilter,
  Menu,
  MonitorCog,
  MoreHorizontal,
  Play,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getExams, getPatients as getFirebasePatients } from '@/lib/firebase/services';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import {
  getPatients,
  getPatientById,
  searchPatients,
  calculateAgeFromBirthDate,
  type PatientWithCalculatedAge,
  getExams as getSupabaseExams,
  startExam as startSupabaseExam,
  completeExam as completeSupabaseExam,
  getExamChecklist,
  saveExamChecklist,
  type ExamChecklist,
  getReports,
  getReportByExam,
  saveReport,
  type InterpretationStatus,
} from '@/lib/supabase/services';

const navItems = [
  ['Dashboard', LayoutDashboard],
  ['환자 조회', Search],
  ['예약 조회', CalendarDays],
  ['검사 Worklist', ClipboardList],
  ['판독 관리', ClipboardList],
  ['근무 현황', UsersRound],
  ['장비 관리', MonitorCog],
  ['시스템 설정', Settings],
] as const;
const CALLABLE_MODALITIES = ['X-ray', 'CT', 'MRI', 'Ultrasound', 'Mammo'];
const DEVICE_TABS = [
  ['전체', '전체 장비'],
  ['X-ray 1', 'X-ray 1'],
  ['X-ray 2', 'X-ray 2'],
  ['건강검진 X-ray', '건강검진 X-ray'],
  ['CT', 'CT-01'],
  ['MRI', 'MR-01'],
  ['Ultrasound', 'US-01'],
  ['Mammo', 'MG-01'],
  ['수술실 C-arm', 'C-arm · 수술실'],
  ['투시실 C-arm', 'C-arm · 투시실'],
  ['Portable X-ray', 'Portable X-ray'],
] as const;
const kpis = [
  ['선택일 검사', '-', '전일 대비 +12', 'blue'],
  ['검사 대기', '-', '평균 대기 18분', 'amber'],
  ['검사 중', '-', '장비 7대 가동 중', 'cyan'],
  ['검사 완료', '-', '', 'green'],
  ['응급 검사', '-', '즉시 확인 필요', 'red'],
];
const calculateAge = (birthDate?: string, fallbackAge?: number): number => {
  if (!birthDate) return fallbackAge ?? 0;
  const [bYear, bMonth, bDay] = birthDate.split('-').map(Number);
  if (!bYear || !bMonth || !bDay) return fallbackAge ?? 0;
  // 시스템 기준일자 (2026-08-29)
  const refYear = 2026;
  const refMonth = 8;
  const refDay = 29;
  let age = refYear - bYear;
  if (refMonth < bMonth || (refMonth === bMonth && refDay < bDay)) {
    age--;
  }
  return age;
};

type Exam = {
  id: string;
  date: string;
  time: string;
  name: string;
  sex: string;
  age: number;
  birthDate?: string;
  phone?: string;
  exam: string;
  modality: string;
  equipment: string;
  department: string;
  tech: string;
  status: string;
  urgent: boolean;
  accession: string;
  doctor: string;
  memo: string;
  callStatus?: string;
  callTime?: string;
  interpretationStatus?: InterpretationStatus | null;
};
const initialWorklist: Exam[] = [
  {
    id: '202608-01482',
    date: '2026-08-29',
    time: '08:35',
    name: '김민준',
    sex: '남',
    age: 64,
    birthDate: '1962-03-17',
    phone: '010-0000-0001',
    exam: 'Chest PA',
    modality: 'X-ray',
    equipment: 'X-ray 1',
    department: '호흡기내과',
    tech: '이지훈',
    status: '검사중',
    urgent: false,
    accession: 'ACC260829-1482',
    doctor: '장태성',
    memo: '호흡 시 움직임 주의',
  },
  {
    id: '202608-01479',
    date: '2026-08-29',
    time: '08:42',
    name: '이서연',
    sex: '여',
    age: 52,
    birthDate: '1974-05-22',
    phone: '010-0000-0002',
    exam: 'Brain CT (CE)',
    modality: 'CT',
    equipment: 'CT-01',
    department: '신경외과',
    tech: '최유진',
    status: '대기',
    urgent: true,
    accession: 'ACC260829-1479',
    doctor: '김도윤',
    memo: '조영제 동의서 확인 완료',
  },
  {
    id: '202608-01471',
    date: '2026-08-29',
    time: '09:00',
    name: '박지우',
    sex: '남',
    age: 45,
    birthDate: '1981-07-09',
    phone: '010-0000-0003',
    exam: 'L-spine MRI',
    modality: 'MRI',
    equipment: 'MR-01',
    department: '정형외과',
    tech: '한성민',
    status: '대기',
    urgent: false,
    accession: 'ACC260829-1471',
    doctor: '오정민',
    memo: '금속성 임플란트 없음',
  },
  {
    id: '202608-01466',
    date: '2026-08-29',
    time: '09:10',
    name: '최은지',
    sex: '여',
    age: 38,
    birthDate: '1988-02-14',
    phone: '010-0000-0004',
    exam: 'Abdomen US',
    modality: 'Ultrasound',
    equipment: 'US-01',
    department: '소화기내과',
    tech: '정다은',
    status: '검사중',
    urgent: false,
    accession: 'ACC260829-1466',
    doctor: '이현수',
    memo: '8시간 금식 확인',
  },
  {
    id: '202608-01458',
    date: '2026-08-29',
    time: '09:20',
    name: '정현우',
    sex: '남',
    age: 31,
    birthDate: '1995-04-03',
    phone: '010-0000-0005',
    exam: 'Knee AP/LAT',
    modality: 'X-ray',
    equipment: 'X-ray 2',
    department: '정형외과',
    tech: '오세훈',
    status: '완료',
    urgent: false,
    accession: 'ACC260829-1458',
    doctor: '오정민',
    memo: '우측 슬관절',
  },
  {
    id: '202608-01453',
    date: '2026-08-29',
    time: '09:35',
    name: '유지아',
    sex: '여',
    age: 47,
    birthDate: '1979-06-28',
    phone: '010-0000-0006',
    exam: 'Mammography',
    modality: 'Mammo',
    equipment: 'MG-01',
    department: '유방외과',
    tech: '송지은',
    status: '대기',
    urgent: false,
    accession: 'ACC260829-1453',
    doctor: '신아영',
    memo: 'Mammo 여성 방사선사 우선 배정',
  },
  {
    id: '202608-01449',
    date: '2026-08-29',
    time: '09:50',
    name: '임도현',
    sex: '남',
    age: 57,
    birthDate: '1969-01-11',
    phone: '010-0000-0007',
    exam: 'C-spine AP/LAT',
    modality: 'X-ray',
    equipment: 'X-ray 1',
    department: '신경외과',
    tech: '',
    status: '대기',
    urgent: true,
    accession: 'ACC260829-1449',
    doctor: '김도윤',
    memo: '보호대 제거 후 촬영',
  },
  {
    id: '202608-01437',
    date: '2026-08-29',
    time: '10:00',
    name: '서하준',
    sex: '남',
    age: 42,
    birthDate: '1984-08-19',
    phone: '010-0000-0008',
    exam: '건강검진 Chest PA',
    modality: 'X-ray',
    equipment: '건강검진 X-ray',
    department: '건강검진센터',
    tech: '박소연',
    status: '대기',
    urgent: false,
    accession: 'ACC260829-1437',
    doctor: '검진의',
    memo: '건강검진 전용 Worklist',
  },
  {
    id: '202608-01421',
    date: '2026-08-29',
    time: '10:15',
    name: '강수빈',
    sex: '여',
    age: 29,
    birthDate: '1997-04-25',
    phone: '010-0000-0009',
    exam: 'OR C-arm Guidance',
    modality: 'C-arm',
    equipment: 'C-arm · 수술실',
    department: '수술실',
    tech: '문정우',
    status: '대기',
    urgent: false,
    accession: 'ACC260829-1421',
    doctor: '윤성호',
    memo: '수술방 3번',
  },
  {
    id: '202608-01404',
    date: '2026-08-29',
    time: '10:30',
    name: '조영희',
    sex: '여',
    age: 73,
    birthDate: '1953-06-30',
    phone: '010-0000-0010',
    exam: 'Portable Chest AP',
    modality: 'Portable',
    equipment: 'Portable X-ray',
    department: '중환자실',
    tech: '',
    status: '대기',
    urgent: false,
    accession: 'ACC260829-1404',
    doctor: '박진호',
    memo: '검사 대기 상태로 전환',
  },
];
const equipment = [
  ['X-ray 1', '1 / 1', '일반촬영용 · 정상', 1],
  ['X-ray 2', '1 / 1', '일반촬영용 · 정상', 1],
  ['건강검진 X-ray', '1 / 1', '건강검진 전용 · 정상', 1],
  ['CT', '1 / 1', '가동 중', 1],
  ['MRI', '1 / 1', '검사 중', 1],
  ['Ultrasound', '1 / 1', '정상', 1],
  ['Mammo', '1 / 1', '대기', 1],
  ['C-arm · 수술실', '1 / 1', '수술 중', 1],
  ['C-arm · 투시실', '1 / 1', '점검 예정', 0],
  ['Portable X-ray', '1 / 1', '병동 운영', 1],
];
const roomName = (code: string) =>
  ({
    'X-ray 1': 'X-ray 검사실',
    'X-ray 2': 'X-ray 검사실',
    '건강검진 X-ray': '건강검진 촬영실',
    'CT-01': 'CT실',
    'MR-01': 'MRI실',
    'US-01': '초음파실',
    'MG-01': '유방촬영실',
    'C-arm · 수술실': '수술실 C-arm',
    'C-arm · 투시실': '투시실 C-arm',
    'Portable X-ray': 'Portable',
  })[code] ?? code;
const staff = [
  ['이지훈', 'DR-01', '일반촬영'],
  ['오세훈', 'DR-02', '일반촬영'],
  ['최유진', 'CT-01', 'CT'],
  ['한성민', 'MR-01', 'MRI'],
  ['정다은', 'US-01', '초음파'],
  ['송지은', 'MG-01', '유방촬영'],
];
const techOptions = [
  { name: '이지훈', gender: '남' },
  { name: '오세훈', gender: '남' },
  { name: '최유진', gender: '여' },
  { name: '한성민', gender: '남' },
  { name: '정다은', gender: '여' },
  { name: '송지은', gender: '여' },
  { name: '박소연', gender: '여' },
  { name: '문정우', gender: '남' },
];
function Status({ s }: { s: string }) {
  const t =
    s === '완료' || s === '판독완료'
      ? 'complete'
      : s === '검사중' || s === '판독중'
        ? 'progress'
        : s === '대기' || s === '판독대기'
          ? 'waiting'
          : 'ready';
  return (
    <span className={`status ${t}`}>
      <i />
      {s}
    </span>
  );
}

export default function Home() {
  const [active, setActive] = useState('Dashboard'),
    [side, setSide] = useState(false),
    [query, setQuery] = useState(''),
    [room, setRoom] = useState('전체 장비'),
    [deviceTab, setDeviceTab] = useState('전체 장비'),
    [date, setDate] = useState('2026-08-29'),
    [modality, setModality] = useState('전체 Modality'),
    [examStatus, setExamStatus] = useState('전체 상태'),
    [exams, setExams] = useState<Exam[]>([]),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [notice, setNotice] = useState(''),
    [worklistView, setWorklistView] = useState<
      'active' | 'urgent' | 'unassigned' | 'completed'
    >('active'),
    [includeCompleted, setIncludeCompleted] = useState(false),
    [patientQuery, setPatientQuery] = useState(''),
    [patientResult, setPatientResult] = useState<Exam | null>(null),
    [callQueues, setCallQueues] = useState<Record<string, string[]>>({}),
    [callingId, setCallingId] = useState<string | null>(null);
  const [supabasePatients, setSupabasePatients] = useState<PatientWithCalculatedAge[]>([]);
  const [selectedSupabasePatient, setSelectedSupabasePatient] = useState<PatientWithCalculatedAge | null>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [isWorklistLoading, setIsWorklistLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [worklistError, setWorklistError] = useState<string | null>(null);
  const [reservationPatient, setReservationPatient] = useState('');
  const [reservationExam, setReservationExam] = useState('');
  const [reservationRoom, setReservationRoom] = useState('X-ray 1');
  const [reservationDate, setReservationDate] = useState('2026-08-29');
  const [reservationTime, setReservationTime] = useState('09:00');
  const [reservationModality, setReservationModality] =
    useState('전체 Modality');
  const [firestoreStatus, setFirestoreStatus] = useState<'checking' | 'connected' | 'fallback'>('checking');

  const loadSupabaseWorklist = async () => {
    setIsWorklistLoading(true);
    setWorklistError(null);
    try {
      const res = await getSupabaseExams();
      if (res.error) {
        setWorklistError(`Worklist 조회 실패: ${res.error.message}`);
        setExams([]);
        setFirestoreStatus('fallback');
      } else if (res.data) {
        const mapped: Exam[] = res.data.map((item) => {
          let dateStr = '2026-08-29';
          let timeStr = '09:00';
          if (item.order_date) {
            const d = new Date(item.order_date);
            if (!isNaN(d.getTime())) {
              const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
              dateStr = kstDate.toISOString().slice(0, 10);
              timeStr = kstDate.toISOString().slice(11, 16);
            }
          }

          const patient = item.patients;
          const birthDate = patient?.birth_date || undefined;
          const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : 0;

          return {
            id: item.patient_id || item.id,
            date: dateStr,
            time: timeStr,
            name: item.patient_name || patient?.name || '환자',
            sex: (patient?.gender as string) || '남',
            age: calculatedAge,
            birthDate: birthDate,
            phone: patient?.phone || undefined,
            exam: item.exam_name,
            modality: item.modality,
            equipment: item.equipment_id || 'X-ray 1',
            department: item.department || '',
            tech: item.radiographer_name || '',
            status: item.status,
            urgent: item.urgency === '응급',
            accession: item.id,
            doctor: item.order_doctor || '',
            memo: item.notes || '',
            interpretationStatus: item.interpretation_status,
          };
        });
        setExams(mapped);
        setWorklistError(null);
        setFirestoreStatus('connected');
      }
    } catch (err: any) {
      setWorklistError(`Worklist 조회 중 오류 발생: ${err?.message || '알 수 없는 오류'}`);
      setExams([]);
      setFirestoreStatus('fallback');
    } finally {
      setIsWorklistLoading(false);
    }
  };

  const handleStartExam = async (examId: string) => {
    setIsActionLoading(true);
    try {
      const res = await startSupabaseExam(examId);
      if (res.error) {
        setNotice(`[검사 시작 차단] ${res.error.message}`);
        setTimeout(() => setNotice(''), 4000);
      } else {
        setNotice('검사가 시작되었습니다. (DB 상태: 검사중)');
        setTimeout(() => setNotice(''), 3000);
        await loadSupabaseWorklist();
      }
    } catch (err: any) {
      setNotice(`[검사 시작 오류] ${err?.message || '알 수 없는 오류가 발생했습니다.'}`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteExam = async (examId: string) => {
    setIsActionLoading(true);
    try {
      const res = await completeSupabaseExam(examId);
      if (res.error) {
        setNotice(`[검사 완료 실패] ${res.error.message}`);
        setTimeout(() => setNotice(''), 4000);
      } else {
        setNotice('검사가 완료되었습니다. 판독대기 상태로 등록되었습니다.');
        setTimeout(() => setNotice(''), 3000);
        await loadSupabaseWorklist();
      }
    } catch (err: any) {
      setNotice(`[검사 완료 오류] ${err?.message || '알 수 없는 오류가 발생했습니다.'}`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    loadSupabaseWorklist();
  }, []);
  const [reservationSelectedId, setReservationSelectedId] = useState<
    string | null
  >(null);
  const [reportQuery, setReportQuery] = useState('');
  const [reportModality, setReportModality] = useState('전체 Modality');
  const [reportStatus, setReportStatus] = useState('전체 판독상태');
  const [reportSelectedId, setReportSelectedId] = useState<string | null>(null);
  const [reportTexts, setReportTexts] = useState<Record<string, string>>({});
  const [reportRole] = useState<'전문의' | '방사선사'>('전문의');
  const [isReportSaving, setIsReportSaving] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Supabase reports 테이블에서 전체 판독문 로드 및 동기화
  const loadSupabaseReports = async () => {
    setIsReportLoading(true);
    try {
      const res = await getReports();
      if (res.data) {
        const textMap: Record<string, string> = {};
        res.data.forEach((r) => {
          if (r.exam_id && r.findings) {
            textMap[r.exam_id] = r.findings;
          }
        });
        setReportTexts((prev) => ({ ...prev, ...textMap }));
      }
    } catch (err: any) {
      console.error('[loadSupabaseReports] error:', err);
    } finally {
      setIsReportLoading(false);
    }
  };

  // 특정 검사 선택 시 해당 검사의 최신 판독문 Supabase에서 단건 로드
  const loadReportForExam = async (examId: string) => {
    if (!examId) return;
    const targetExam = exams.find((e) => e.id === examId);
    const accession = targetExam?.accession || examId;
    try {
      const res = await getReportByExam(accession);
      if (res.data?.findings) {
        setReportTexts((prev) => ({
          ...prev,
          [accession]: res.data!.findings || '',
          [examId]: res.data!.findings || '',
        }));
      } else if (accession !== examId) {
        const res2 = await getReportByExam(examId);
        if (res2.data?.findings) {
          setReportTexts((prev) => ({
            ...prev,
            [accession]: res2.data!.findings || '',
            [examId]: res2.data!.findings || '',
          }));
        }
      }
    } catch (err: any) {
      console.error('[loadReportForExam] error:', err);
    }
  };

  // 판독 완료/저장 처리 (Supabase reports 및 exams.interpretation_status 연동)
  const handleSaveReport = async (examId: string, findingsText: string) => {
    if (!examId) return;
    if (reportRole !== '전문의') {
      setNotice('방사선사는 판독문 저장 권한이 없습니다.');
      setTimeout(() => setNotice(''), 3000);
      return;
    }
    if (!findingsText.trim()) {
      setNotice('판독문 내용을 입력해 주세요.');
      setTimeout(() => setNotice(''), 3000);
      return;
    }

    setIsReportSaving(true);
    try {
      const res = await saveReport({
        examId,
        findings: findingsText,
        status: '판독완료',
        radiologistName: '장태성', // 영상의학과 전문의
      });

      if (res.error) {
        setNotice(`[판독 저장 실패] ${res.error.message}`);
        setTimeout(() => setNotice(''), 4000);
      } else {
        setNotice('판독문이 성공적으로 저장 및 확정되었습니다.');
        setTimeout(() => setNotice(''), 3000);
        // Worklist 및 판독 상태 새로고침
        await loadSupabaseWorklist();
        await loadSupabaseReports();
      }
    } catch (err: any) {
      setNotice(`[판독 저장 오류] ${err?.message || '알 수 없는 오류'}`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsReportSaving(false);
    }
  };

  // 판독 관리 메뉴가 열릴 때 전체 reports 로드
  useEffect(() => {
    if (active === '판독 관리') {
      loadSupabaseReports();
    }
  }, [active]);

  // 판독 관리에서 특정 검사 선택 시 단건 로드
  useEffect(() => {
    if (active === '판독 관리' && reportSelectedId) {
      loadReportForExam(reportSelectedId);
    }
  }, [active, reportSelectedId]);
  const [prepChecks, setPrepChecks] = useState<Record<string, string>>({});
  const [orFastingVerifications, setOrFastingVerifications] = useState<
    Record<
      string,
      {
        verifiedDoctor: string;
        departmentOrRole: string;
        clinicalReason: string;
        isEmergencySurgery: boolean;
      }
    >
  >({});
  const [isChecklistSaving, setIsChecklistSaving] = useState(false);
  const [isChecklistLoading, setIsChecklistLoading] = useState(false);

  // Supabase exam_checklists DB에서 해당 검사의 체크리스트 조회
  const loadChecklistForExam = async (examAccession: string, patientId: string) => {
    if (!examAccession) return;
    setIsChecklistLoading(true);
    try {
      const res = await getExamChecklist(examAccession);
      if (res.data) {
        const d = res.data;
        const newChecks: Record<string, string> = {};

        // CT 항목 매핑
        if (d.uses_contrast !== undefined) {
          newChecks[`${patientId}-조영제 사용 여부`] = d.uses_contrast ? '확인 완료' : '해당 없음';
        }
        if (d.contrast_allergy) newChecks[`${patientId}-조영제 알레르기 여부`] = d.contrast_allergy;
        if (d.kidney_function) newChecks[`${patientId}-신장기능 확인`] = d.kidney_function;
        if (d.fasting_confirmed) newChecks[`${patientId}-금식 여부`] = d.fasting_confirmed;
        if (d.iv_access_confirmed) newChecks[`${patientId}-정맥주사(IV) 확보 여부`] = d.iv_access_confirmed;
        if (d.pregnancy_risk) newChecks[`${patientId}-임신 가능성`] = d.pregnancy_risk;
        if (d.mobility_status) newChecks[`${patientId}-휠체어 / 보행보조 여부`] = d.mobility_status;

        // MRI 항목 매핑
        if (d.contrast_allergy || d.kidney_function) {
          newChecks[`${patientId}-조영제 알레르기 및 신장기능 확인`] =
            d.contrast_allergy === '확인 완료' && d.kidney_function === '확인 완료' ? '확인 완료' : (d.contrast_allergy || '추가 확인 필요');
        }
        if (d.pacemaker_or_electronics) newChecks[`${patientId}-심박동기 등 체내 전자기기`] = d.pacemaker_or_electronics;
        if (d.metallic_implants) newChecks[`${patientId}-인공관절 / 금속 임플란트`] = d.metallic_implants;
        if (d.clips_coils_stents) newChecks[`${patientId}-수술용 클립 / 코일 / 스텐트`] = d.clips_coils_stents;
        if (d.internal_fixations) newChecks[`${patientId}-체내 금속성 고정물`] = d.internal_fixations;
        if (d.foreign_metal_bodies) newChecks[`${patientId}-금속성 이물질 여부`] = d.foreign_metal_bodies;
        if (d.removable_metals_hearing_aids) newChecks[`${patientId}-보청기 등 제거 필요 물품`] = d.removable_metals_hearing_aids;
        if (d.mobility_status) newChecks[`${patientId}-휠체어 / 이동 보조 필요 여부`] = d.mobility_status;
        if (d.claustrophobia) newChecks[`${patientId}-폐쇄공포증 여부`] = d.claustrophobia;

        // C-arm 항목 매핑
        if (d.or_carm_safety?.fastingStatus) {
          newChecks[`${patientId}-수술 전 금식 상태 확인`] = d.or_carm_safety.fastingStatus;
          if (d.or_carm_safety.medicalStaffVerification) {
            setOrFastingVerifications((prev) => ({
              ...prev,
              [patientId]: {
                verifiedDoctor: d.or_carm_safety.medicalStaffVerification.verifiedDoctor || '',
                departmentOrRole: d.or_carm_safety.medicalStaffVerification.departmentOrRole || '마취통증의학과',
                clinicalReason: d.or_carm_safety.medicalStaffVerification.clinicalReason || '',
                isEmergencySurgery: !!d.or_carm_safety.medicalStaffVerification.isEmergencySurgery,
              },
            }));
          }
        }

        // 초음파(US) 항목 매핑
        if (d.us_preparation?.fastingConfirmed) {
          newChecks[`${patientId}-금식 상태 확인 (6~8시간)`] = d.us_preparation.fastingConfirmed;
        }
        if (d.us_preparation?.fullBladderConfirmed) {
          newChecks[`${patientId}-방광 충만 확인 (소변 참기)`] = d.us_preparation.fullBladderConfirmed;
        }

        setPrepChecks((prev) => ({ ...prev, ...newChecks }));
      }
    } catch (err: any) {
      console.error('[loadChecklistForExam] error:', err);
    } finally {
      setIsChecklistLoading(false);
    }
  };

  // 체크리스트 저장 (Supabase INSERT 또는 UPDATE)
  const saveChecklistForExam = async (
    targetExam: Exam,
    updatedChecks: Record<string, string>,
    updatedOrFasting?: {
      verifiedDoctor: string;
      departmentOrRole: string;
      clinicalReason: string;
      isEmergencySurgery: boolean;
    }
  ) => {
    const accession = targetExam.accession || targetExam.id;
    if (!accession) return;

    setIsChecklistSaving(true);
    try {
      const pid = targetExam.id;
      const m = targetExam.modality;
      const isOr =
        m === 'C-arm' &&
        (targetExam.equipment?.includes('수술실') || targetExam.equipment === 'C-arm · 수술실');
      const isUltrasound = m === 'US' || m === 'Ultrasound';

      const payload: Partial<ExamChecklist> & { exam_id: string; overall_status: any } = {
        exam_id: accession,
        overall_status: '확인 필요',
        checked_by: targetExam.tech || '담당 방사선사',
      };

      if (m === 'CT') {
        const usesContrastVal = updatedChecks[`${pid}-조영제 사용 여부`];
        payload.uses_contrast = usesContrastVal === '확인 완료';
        payload.contrast_consent_confirmed = (updatedChecks[`${pid}-조영제 사용 여부`] as any) || '미확인';
        payload.contrast_allergy = (updatedChecks[`${pid}-조영제 알레르기 여부`] as any) || '미확인';
        payload.kidney_function = (updatedChecks[`${pid}-신장기능 확인`] as any) || '미확인';
        payload.fasting_confirmed = (updatedChecks[`${pid}-금식 여부`] as any) || '미확인';
        payload.iv_access_confirmed = (updatedChecks[`${pid}-정맥주사(IV) 확보 여부`] as any) || '미확인';
        payload.pregnancy_risk = (updatedChecks[`${pid}-임신 가능성`] as any) || '미확인';
        payload.mobility_status = (updatedChecks[`${pid}-휠체어 / 보행보조 여부`] as any) || '미확인';

        const isCTComplete =
          payload.pregnancy_risk === '확인 완료' &&
          payload.mobility_status === '확인 완료' &&
          (!payload.uses_contrast ||
            (payload.contrast_allergy === '확인 완료' &&
              payload.kidney_function === '확인 완료' &&
              payload.fasting_confirmed === '확인 완료' &&
              payload.iv_access_confirmed === '확인 완료'));
        payload.overall_status = isCTComplete ? '검사 가능' : '확인 필요';
      } else if (m === 'MRI') {
        payload.pregnancy_risk = (updatedChecks[`${pid}-임신 가능성`] as any) || '미확인';
        payload.pacemaker_or_electronics = (updatedChecks[`${pid}-심박동기 등 체내 전자기기`] as any) || '미확인';
        payload.pacemaker_mr_status =
          payload.pacemaker_or_electronics === '해당 없음'
            ? 'MR Safe'
            : payload.pacemaker_or_electronics === '확인 완료'
              ? 'MR Conditional'
              : '미확인';
        payload.metallic_implants = (updatedChecks[`${pid}-인공관절 / 금속 임플란트`] as any) || '미확인';
        payload.implant_mr_status =
          payload.metallic_implants === '해당 없음'
            ? 'MR Safe'
            : payload.metallic_implants === '확인 완료'
              ? 'MR Conditional'
              : '미확인';
        payload.clips_coils_stents = (updatedChecks[`${pid}-수술용 클립 / 코일 / 스텐트`] as any) || '미확인';
        payload.clips_mr_status =
          payload.clips_coils_stents === '해당 없음'
            ? 'MR Safe'
            : payload.clips_coils_stents === '확인 완료'
              ? 'MR Conditional'
              : '미확인';
        payload.internal_fixations = (updatedChecks[`${pid}-체내 금속성 고정물`] as any) || '미확인';
        payload.foreign_metal_bodies = (updatedChecks[`${pid}-금속성 이물질 여부`] as any) || '미확인';
        payload.removable_metals_hearing_aids = (updatedChecks[`${pid}-보청기 등 제거 필요 물품`] as any) || '미확인';
        payload.mobility_status = (updatedChecks[`${pid}-휠체어 / 이동 보조 필요 여부`] as any) || '미확인';
        payload.claustrophobia = (updatedChecks[`${pid}-폐쇄공포증 여부`] as any) || '미확인';

        const mriCleared =
          (payload.pregnancy_risk === '확인 완료' || payload.pregnancy_risk === '해당 없음') &&
          (payload.pacemaker_or_electronics === '확인 완료' || payload.pacemaker_or_electronics === '해당 없음') &&
          (payload.metallic_implants === '확인 완료' || payload.metallic_implants === '해당 없음') &&
          (payload.clips_coils_stents === '확인 완료' || payload.clips_coils_stents === '해당 없음') &&
          (payload.foreign_metal_bodies === '확인 완료' || payload.foreign_metal_bodies === '해당 없음') &&
          (payload.removable_metals_hearing_aids === '확인 완료' || payload.removable_metals_hearing_aids === '해당 없음') &&
          (payload.claustrophobia === '확인 완료' || payload.claustrophobia === '해당 없음');
        payload.overall_status = mriCleared ? '검사 가능' : '확인 필요';
      } else if (isOr) {
        const fStatus = updatedChecks[`${pid}-수술 전 금식 상태 확인`] || '미확인';
        const orVerif = updatedOrFasting || orFastingVerifications[pid];
        payload.or_carm_safety = {
          fastingStatus: fStatus,
          medicalStaffVerification: orVerif || null,
        };
        const orCarmOk =
          fStatus === '확인 완료' ||
          (fStatus === '해당 없음/의료진 확인' &&
            Boolean(orVerif?.verifiedDoctor?.trim() && orVerif?.clinicalReason?.trim()));
        payload.overall_status = orCarmOk ? '검사 가능' : '확인 필요';
      } else if (isUltrasound) {
        const fastingVal = updatedChecks[`${pid}-금식 상태 확인 (6~8시간)`] || '미확인';
        const bladderVal = updatedChecks[`${pid}-방광 충만 확인 (소변 참기)`] || '미확인';
        payload.us_protocol = {
          requiresFasting:
            targetExam.exam?.includes('Abdomen') ||
            targetExam.exam?.includes('복부') ||
            targetExam.exam?.includes('Liver') ||
            targetExam.exam?.includes('간'),
          requiresFullBladder:
            targetExam.exam?.includes('Pelvis') ||
            targetExam.exam?.includes('골반') ||
            targetExam.exam?.includes('Bladder') ||
            targetExam.exam?.includes('방광') ||
            targetExam.exam?.includes('비뇨'),
        };
        payload.us_preparation = {
          fastingConfirmed: fastingVal,
          fullBladderConfirmed: bladderVal,
        };
        const usOk =
          (!payload.us_protocol.requiresFasting || fastingVal === '확인 완료' || fastingVal === '해당 없음') &&
          (!payload.us_protocol.requiresFullBladder || bladderVal === '확인 완료' || bladderVal === '해당 없음');
        payload.overall_status = usOk ? '검사 가능' : '확인 필요';
      } else {
        payload.overall_status = '검사 가능';
      }

      await saveExamChecklist(payload);
    } catch (err: any) {
      console.error('[saveChecklistForExam] error:', err);
    } finally {
      setIsChecklistSaving(false);
    }
  };

  const selected = exams.find((exam) => exam.id === selectedId) ?? null;

  // 검사 상세 드로어 열릴 때 Supabase exam_checklists에서 체크리스트 로드
  useEffect(() => {
    if (selectedId && selected?.accession) {
      loadChecklistForExam(selected.accession, selected.id);
    }
  }, [selectedId, selected?.accession]);

  const [assignDate, setAssignDate] = useState('2026-08-29');
  const [assignShift, setAssignShift] = useState('주간');
  const [assignTechName, setAssignTechName] = useState('');
  const [assignEquipment, setAssignEquipment] = useState('X-ray 1');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [equipmentSelected, setEquipmentSelected] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState({ hospital: '예수사랑병원', ris: '예수사랑병원 RIS', ttsRate: '0.9', ttsPitch: '1.0', defaultStatus: '대기', alerts: true });
  const [equipmentStatuses, setEquipmentStatuses] = useState<Record<string, string>>({});
  const equipmentStatusOptions = ['정상', '사용중', '점검예정', '점검중', '고장', '사용중지'];
  const reservationSlots = ['09:00', '09:30', '10:00', '10:30', '11:00'];
  const reservationConflict = exams.some(
    (exam) =>
      exam.equipment === reservationRoom &&
      exam.date === reservationDate &&
      exam.time === reservationTime,
  );
  const reservationRows = exams.filter(
    (exam) =>
      exam.date === reservationDate &&
      (!reservationPatient ||
        `${exam.id} ${exam.name}`
          .toLowerCase()
          .includes(reservationPatient.toLowerCase())) &&
      (reservationRoom === '전체 장비' || exam.equipment === reservationRoom) &&
      (reservationModality === '전체 Modality' ||
        exam.modality === reservationModality),
  );
  const todayReservationCount = reservationRows.length;
  const reportRows = exams.filter(
    (exam) => {
      const currentInterp = exam.interpretationStatus || (reportTexts[exam.id] ? '판독완료' : '판독대기');
      return (
        exam.status === '완료' &&
        (!reportQuery ||
          exam.name.includes(reportQuery) ||
          exam.id.includes(reportQuery)) &&
        (reportModality === '전체 Modality' ||
          exam.modality === reportModality) &&
        (reportStatus === '전체 판독상태' || currentInterp === reportStatus)
      );
    }
  );
  const reportSelected =
    exams.find((exam) => exam.id === reportSelectedId) ?? null;
  const assignSave = () => {
    if (!assignTechName) return;
    const tech = techOptions.find((t) => t.name === assignTechName);
    if (assignEquipment === 'MG-01' && tech?.gender !== '여') return;
    const duplicate = Object.entries(assignments).some(
      ([key, value]) =>
        key.startsWith(`${assignDate}|${assignShift}|`) &&
        value === assignTechName &&
        !key.endsWith(`|${assignEquipment}`),
    );
    if (duplicate) {
      setNotice('동일 시간대 중복 배정을 차단했습니다.');
      return;
    }
    setAssignments({
      ...assignments,
      [`${assignDate}|${assignShift}|${assignEquipment}`]: assignTechName,
    });
    setNotice('방사선사 배정이 저장되었습니다.');
  };
  // Distinguish Modalities requiring safety checklist
  const isOrCarm =
    selected?.modality === 'C-arm' &&
    (selected?.equipment?.includes('수술실') || selected?.equipment === 'C-arm · 수술실');
  const isUS = selected?.modality === 'US' || selected?.modality === 'Ultrasound';

  // US protocol requirements definition based on exam name
  const usProtocol = isUS
    ? {
        requiresFasting:
          selected?.exam?.includes('Abdomen') ||
          selected?.exam?.includes('복부') ||
          selected?.exam?.includes('Liver') ||
          selected?.exam?.includes('간'),
        requiresFullBladder:
          selected?.exam?.includes('Pelvis') ||
          selected?.exam?.includes('골반') ||
          selected?.exam?.includes('Bladder') ||
          selected?.exam?.includes('방광') ||
          selected?.exam?.includes('비뇨'),
        requiresOtherPreparation: false,
      }
    : null;

  const usRequiredItems: string[] = [];
  if (isUS && usProtocol) {
    if (usProtocol.requiresFasting) usRequiredItems.push('금식 상태 확인 (6~8시간)');
    if (usProtocol.requiresFullBladder) usRequiredItems.push('방광 충만 확인 (소변 참기)');
  }

  const isSafetyModality =
    selected?.modality === 'CT' ||
    selected?.modality === 'MRI' ||
    isOrCarm ||
    (isUS && usRequiredItems.length > 0);

  const prepItems =
    selected?.modality === 'CT'
      ? [
          '조영제 사용 여부',
          '조영제 알레르기 여부',
          '신장기능 확인',
          '금식 여부',
          '정맥주사(IV) 확보 여부',
          '임신 가능성',
          '휠체어 / 보행보조 여부',
        ]
      : selected?.modality === 'MRI'
        ? [
            '조영제 사용 여부',
            '조영제 알레르기 및 신장기능 확인',
            '임신 가능성',
            '심박동기 등 체내 전자기기',
            '인공관절 / 금속 임플란트',
            '수술용 클립 / 코일 / 스텐트',
            '체내 금속성 고정물',
            '금속성 이물질 여부',
            '보청기 등 제거 필요 물품',
            '휠체어 / 이동 보조 필요 여부',
            '폐쇄공포증 여부',
          ]
        : isOrCarm
          ? ['수술 전 금식 상태 확인']
          : isUS
            ? usRequiredItems
            : [];

  // OR C-arm Fasting Clearance evaluation
  const orCarmFastingStatus = isOrCarm
    ? (prepChecks[`${selected?.id}-수술 전 금식 상태 확인`] ?? '추가 확인 필요')
    : '해당 없음';
  const orCarmVerificationData = selected?.id ? orFastingVerifications[selected.id] : undefined;
  const isOrCarmCleared =
    !isOrCarm ||
    orCarmFastingStatus === '확인 완료' ||
    (orCarmFastingStatus === '해당 없음/의료진 확인' &&
      Boolean(orCarmVerificationData?.verifiedDoctor?.trim() && orCarmVerificationData?.clinicalReason?.trim()));

  // US protocol preparation clearance evaluation
  const isUsCleared =
    !isUS ||
    usRequiredItems.length === 0 ||
    usRequiredItems.every((item) => {
      const val = prepChecks[`${selected?.id}-${item}`];
      return val === '확인 완료' || val === '해당 없음' || val === '해당없음';
    });

  // Strict safety clearance evaluation
  const prepComplete = !isSafetyModality
    ? true
    : isOrCarm
      ? isOrCarmCleared
      : isUS
        ? isUsCleared
        : prepItems.every((item) => {
            const val = prepChecks[`${selected?.id}-${item}`];
            return val === '확인 완료' || val === '해당 없음' || val === '해당없음';
          });

  const clearanceStatus = !isSafetyModality
    ? '검사 가능'
    : prepComplete
      ? '검사 가능'
      : '확인 필요';

  const canStartExam =
    selected?.status === '대기' &&
    (!isSafetyModality || (prepComplete && clearanceStatus === '검사 가능'));
  const canCompleteExam = selected?.status === '검사중';
  const assignedTechForEquipment = (equipmentName: string) =>
    assignments[`${assignDate}|${assignShift}|${equipmentName}`] ??
    assignments[
      `${assignDate}|${assignShift}|${({ 'CT-01': 'CT', 'MR-01': 'MRI', 'US-01': 'Ultrasound', 'MG-01': 'Mammo' } as Record<string, string>)[equipmentName] ?? equipmentName}`
    ] ??
    exams.find(
      (exam) =>
        exam.date === assignDate &&
        (exam.equipment === equipmentName ||
          (equipmentName === 'CT' && exam.equipment === 'CT-01') ||
          (equipmentName === 'MRI' && exam.equipment === 'MR-01') ||
          (equipmentName === 'Ultrasound' && exam.equipment === 'US-01') ||
          (equipmentName === 'Mammo' && exam.equipment === 'MG-01')) &&
        Boolean(exam.tech),
    )?.tech ??
    '';
  const assignedTechFor = (exam: Exam) =>
    assignments[`${exam.date}|${assignShift}|${exam.equipment}`] ??
    assignedTechForEquipment(exam.equipment);
  const registerReservation = () => {
    if (!reservationPatient || !reservationExam || reservationConflict) return;
    const source = exams.find((exam) => exam.id === reservationPatient);
    if (!source) return;
    setExams((current) => [
      ...current,
      {
        ...source,
        id: `${source.id}-R${current.length}`,
        date: reservationDate,
        time: reservationTime,
        exam: reservationExam,
        equipment: reservationRoom,
        status: '대기',
        callStatus: undefined,
        callTime: undefined,
      },
    ]);
    setNotice('검사 예약이 완료되어 Worklist에 반영되었습니다.');
    setActive('Dashboard');
  };
  // 검사 오더 등록 모듈은 비활성화되어 기존 Worklist/환자 조회만 유지합니다.
  const orderExam = {
    modality: 'X-ray',
    exam: '',
    department: '',
    doctor: '',
    priority: '일반',
  };
  const setOrderExam = (_value: typeof orderExam) => undefined;
  const registerOrder = () => undefined;
  const rows = exams.filter((exam) => {
    const keyword = query.trim().toLowerCase();
    const matchesKeyword =
      !keyword ||
      exam.id.toLowerCase().includes(keyword) ||
      exam.name.toLowerCase().includes(keyword);
    const activeStatuses = ['대기', '검사중'];
    const matchesView =
      worklistView === 'completed'
        ? exam.status === '완료'
        : worklistView === 'urgent'
          ? exam.urgent &&
            (includeCompleted || activeStatuses.includes(exam.status))
          : worklistView === 'unassigned'
            ? !exam.tech &&
              (includeCompleted || activeStatuses.includes(exam.status))
            : includeCompleted || examStatus === '완료'
              ? true
              : activeStatuses.includes(exam.status);
    return (
      matchesKeyword &&
      exam.date === date &&
      matchesView &&
      (deviceTab === '전체 장비' || exam.equipment === deviceTab) &&
      (room === '전체 장비' || exam.equipment === room) &&
      (modality === '전체 Modality' || exam.modality === modality) &&
      (examStatus === '전체 상태' || exam.status === examStatus)
    );
  });
  const updateExam = (id: string, patch: Partial<Exam>) => {
    const targetExam = exams.find((exam) => exam.id === id);
    if (!targetExam) return;

    // 1. Double Verification for Starting Exam (대기 -> 검사중)
    if (patch.status === '검사중') {
      if (targetExam.status !== '대기') {
        setNotice(`잘못된 상태 전환입니다. '대기' 상태에서만 시작할 수 있습니다. (현재: ${targetExam.status})`);
        setTimeout(() => setNotice(''), 3000);
        return;
      }

      // CT/MRI Safety Checklist Strict Enforcement
      if (targetExam.modality === 'CT' || targetExam.modality === 'MRI') {
        const requiredItems =
          targetExam.modality === 'CT'
            ? [
                '조영제 사용 여부',
                '조영제 알레르기 여부',
                '신장기능 확인',
                '금식 여부',
                '정맥주사(IV) 확보 여부',
                '임신 가능성',
                '휠체어 / 보행보조 여부',
              ]
            : [
                '조영제 사용 여부',
                '조영제 알레르기 및 신장기능 확인',
                '임신 가능성',
                '심박동기 등 체내 전자기기',
                '인공관절 / 금속 임플란트',
                '수술용 클립 / 코일 / 스텐트',
                '체내 금속성 고정물',
                '금속성 이물질 여부',
                '보청기 등 제거 필요 물품',
                '휠체어 / 이동 보조 필요 여부',
                '폐쇄공포증 여부',
              ];

        const unverifiedItems = requiredItems.filter((item) => {
          const val = prepChecks[`${targetExam.id}-${item}`] ?? '추가 확인 필요';
          return val !== '확인 완료' && val !== '해당 없음' && val !== '해당없음';
        });

        if (unverifiedItems.length > 0) {
          setNotice(`[안전 점검 미통과] ${targetExam.modality} 필수 체크리스트 항목(${unverifiedItems.length}건) 확인이 필요합니다.`);
          setTimeout(() => setNotice(''), 3500);
          return;
        }
      }

      // OR C-arm Preoperative Fasting Safety Strict Enforcement
      const isTargetOrCarm =
        targetExam.modality === 'C-arm' &&
        (targetExam.equipment?.includes('수술실') || targetExam.equipment === 'C-arm · 수술실');

      if (isTargetOrCarm) {
        const fastingVal = prepChecks[`${targetExam.id}-수술 전 금식 상태 확인`] ?? '추가 확인 필요';
        const verifData = orFastingVerifications[targetExam.id];

        if (fastingVal === '추가 확인 필요' || fastingVal === '미확인') {
          setNotice(`[수술실 안전 점검 미통과] 수술 전 금식 상태 확인이 완료되지 않았습니다. (${fastingVal})`);
          setTimeout(() => setNotice(''), 3500);
          return;
        }

        if (fastingVal === '해당 없음/의료진 확인') {
          if (!verifData?.verifiedDoctor?.trim() || !verifData?.clinicalReason?.trim()) {
            setNotice(`[수술실 안전 점검 미통과] 수술팀/마취과 의료진의 확인 정보(확인의, 임상 사유)를 입력해 주세요.`);
            setTimeout(() => setNotice(''), 4000);
            return;
          }
        }
      }

      // Ultrasound (초음파) Protocol-Specific Preparation Strict Enforcement
      const isTargetUS = targetExam.modality === 'US' || targetExam.modality === 'Ultrasound';
      if (isTargetUS) {
        const reqItems: string[] = [];
        if (
          targetExam.exam.includes('Abdomen') ||
          targetExam.exam.includes('복부') ||
          targetExam.exam.includes('Liver') ||
          targetExam.exam.includes('간')
        ) {
          reqItems.push('금식 상태 확인 (6~8시간)');
        }
        if (
          targetExam.exam.includes('Pelvis') ||
          targetExam.exam.includes('골반') ||
          targetExam.exam.includes('Bladder') ||
          targetExam.exam.includes('방광') ||
          targetExam.exam.includes('비뇨')
        ) {
          reqItems.push('방광 충만 확인 (소변 참기)');
        }

        const unverifiedUsItems = reqItems.filter((item) => {
          const val = prepChecks[`${targetExam.id}-${item}`] ?? '추가 확인 필요';
          return val !== '확인 완료' && val !== '해당 없음' && val !== '해당없음';
        });

        if (unverifiedUsItems.length > 0) {
          setNotice(`[초음파 준비사항 미확인] ${unverifiedUsItems.join(', ')} 확인이 필요합니다.`);
          setTimeout(() => setNotice(''), 3500);
          return;
        }
      }
    }

    // 2. Double Verification for Completing Exam (검사중 -> 완료)
    if (patch.status === '완료') {
      if (targetExam.status !== '검사중') {
        setNotice(`잘못된 상태 전환입니다. '검사중' 상태의 검사만 완료할 수 있습니다. (현재: ${targetExam.status})`);
        setTimeout(() => setNotice(''), 3000);
        return;
      }
    }

    setExams((current) =>
      current.map((exam) => (exam.id === id ? { ...exam, ...patch } : exam)),
    );
    setNotice('변경사항이 Worklist에 반영되었습니다.');
    setTimeout(() => setNotice(''), 2200);
  };
  const speakCall = (exam: Exam) => {
    if (!CALLABLE_MODALITIES.includes(exam.modality) || exam.status !== '대기')
      return;
    const roomLabel = roomName(exam.equipment);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if ('AudioContext' in window) {
        const AudioContextClass = window.AudioContext;
        if (!AudioContextClass) return;
        const audioContext = new AudioContextClass();
        [660, 880].forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const start = audioContext.currentTime + index * 0.14;
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.05, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
          oscillator.connect(gain).connect(audioContext.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.16);
        });
      }
      const utterance = new window.SpeechSynthesisUtterance(
        `${exam.name} 환자분, ${roomLabel}로 들어와 주시기 바랍니다.`,
      );
      utterance.lang = 'ko-KR';
      utterance.rate = 0.82;
      utterance.pitch = 1.03;
      const voices = window.speechSynthesis.getVoices();
      const koreanVoices = voices.filter((voice) =>
        voice.lang.toLowerCase().startsWith('ko'),
      );
      const femaleVoice = koreanVoices.find((voice) =>
        /female|여성|woman|girl|yuna|sora|heami/i.test(voice.name),
      );
      utterance.voice = femaleVoice ?? koreanVoices[0] ?? null;
      window.setTimeout(() => window.speechSynthesis.speak(utterance), 180);
    }
    const calledAt = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    updateExam(exam.id, { callStatus: '호출 완료', callTime: calledAt });
    setCallingId(exam.id);
    setTimeout(() => setCallingId(null), 1800);
  };
  const receiveExam = (exam: Exam) => {
    updateExam(exam.id, { status: '대기', callStatus: '대기중' });
    if (!CALLABLE_MODALITIES.includes(exam.modality)) return;
    setCallQueues((queues) => ({
      ...queues,
      [exam.equipment]: [...(queues[exam.equipment] ?? []), exam.id],
    }));
    setTimeout(() => speakCall({ ...exam, status: '대기' }), 350);
  };
  const assignTech = (exam: Exam, tech: string) => {
    if (
      exam.modality === 'Mammo' &&
      techOptions.find((item) => item.name === tech)?.gender !== '여'
    ) {
      setNotice('Mammo는 여성 방사선사를 기본 배정해야 합니다.');
      return;
    }
    const duplicate = exams.some(
      (item) =>
        item.id !== exam.id &&
        item.tech === tech &&
        item.date === exam.date &&
        item.time === exam.time &&
        item.status !== '완료' &&
        item.status !== '완료',
    );
    if (duplicate) {
      setNotice(`${tech} 방사선사는 동일 시간에 이미 배정되어 있습니다.`);
      return;
    }
    updateExam(exam.id, { tech });
  };

  const loadSupabasePatients = async () => {
    setIsSearchingPatient(true);
    setPatientSearchError(null);
    try {
      const res = await getPatients();
      if (res.error) {
        setPatientSearchError(`환자 목록 조회 실패: ${res.error.message}`);
        setSupabasePatients([]);
        setSelectedSupabasePatient(null);
      } else {
        const patients = res.data || [];
        setSupabasePatients(patients);
        if (patients.length > 0) {
          setSelectedSupabasePatient((prev) => prev ? (patients.find(p => p.id === prev.id) || patients[0]) : patients[0]);
        } else {
          setSelectedSupabasePatient(null);
        }
      }
    } catch (err: any) {
      setPatientSearchError(`환자 목록 조회 중 오류 발생: ${err?.message || '알 수 없는 오류'}`);
      setSupabasePatients([]);
      setSelectedSupabasePatient(null);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handleSelectPatient = async (p: PatientWithCalculatedAge) => {
    // getPatientById 사용하여 상세 정보 조회
    try {
      const res = await getPatientById(p.id);
      if (res.data) {
        setSelectedSupabasePatient(res.data);
      } else {
        setSelectedSupabasePatient(p);
      }
    } catch {
      setSelectedSupabasePatient(p);
    }
  };

  const findPatient = async () => {
    const value = patientQuery.trim();
    setIsSearchingPatient(true);
    setPatientSearchError(null);
    try {
      if (!value) {
        const res = await getPatients();
        if (res.error) {
          setPatientSearchError(`환자 목록 조회 실패: ${res.error.message}`);
          setSupabasePatients([]);
          setSelectedSupabasePatient(null);
        } else {
          const list = res.data || [];
          setSupabasePatients(list);
          setSelectedSupabasePatient(list.length > 0 ? list[0] : null);
        }
        return;
      }

      const res = await searchPatients(value);
      if (res.error) {
        setPatientSearchError(`환자 검색 실패: ${res.error.message}`);
        setSupabasePatients([]);
        setSelectedSupabasePatient(null);
      } else {
        const list = res.data || [];
        setSupabasePatients(list);
        if (list.length > 0) {
          setSelectedSupabasePatient(list[0]);
        } else {
          setSelectedSupabasePatient(null);
        }
      }
    } catch (err: any) {
      setPatientSearchError(`환자 검색 중 오류 발생: ${err?.message || '알 수 없는 오류'}`);
      setSupabasePatients([]);
      setSelectedSupabasePatient(null);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  useEffect(() => {
    if (active === '환자 조회' && supabasePatients.length === 0 && !patientSearchError) {
      loadSupabasePatients();
    }
  }, [active]);
  const todayExams = exams.filter((exam) => exam.date === date);
  const liveKpis = kpis.map((item) => {
    if (worklistError) {
      return [item[0], '오류', '데이터 조회 실패', item[3]];
    }
    if (isWorklistLoading && exams.length === 0) {
      return [item[0], '-', item[2], item[3]];
    }
    if (item[0] === '선택일 검사' || item[0] === '오늘 검사') {
      return [item[0], String(todayExams.length), item[2], item[3]];
    }
    if (item[0] === '검사 대기') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.status === '대기').length),
        item[2],
        item[3],
      ];
    }
    if (item[0] === '검사 중') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.status === '검사중').length),
        item[2],
        item[3],
      ];
    }
    if (item[0] === '검사 완료') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.status === '완료').length),
        item[2],
        item[3],
      ];
    }
    if (item[0] === '응급 검사') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.urgent).length),
        item[2],
        item[3],
      ];
    }
    return item;
  });

  return (
    <main className="app-shell">
      <aside className={`sidebar ${side ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <img src="/logo.png" alt="예수사랑병원 로고" />
          </div>
          <div>
            <strong>예수사랑병원</strong>
            <small>Radiology Information System</small>
          </div>
          <button className="mobile-close" onClick={() => setSide(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="hospital-chip">
          <i />
          영상의학과 <small>RIS</small>
        </div>
        <nav>
          {navItems.map(([label, Icon], i) => (
            <button
              key={label}
              className={active === label ? 'active' : ''}
              onClick={() => {
                setActive(label);
                setSide(false);
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === '예약 조회' && <em>{todayReservationCount}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={16} />
          <div>
            <span>보안 연결</span>
            <small>PACS · EMR 연동 정상</small>
          </div>
        </div>
      </aside>
      {side && <button className="backdrop" onClick={() => setSide(false)} />}
      <section className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" onClick={() => setSide(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h1>Dashboard</h1>
              <p>영상의학과 운영 현황</p>
            </div>
          </div>
          <div className="global-search">
            <Search size={17} />
            <input placeholder="환자번호, 환자명, 검사명 검색" />
            <kbd>F2</kbd>
          </div>
          <div className="top-actions">
            <div className="system-state" title={firestoreStatus === 'connected' ? 'Cloud Firestore 실시간 연동됨' : '로컬 모드 (Mock Fallback 동작)'}>
              <i style={firestoreStatus === 'fallback' ? { background: '#f59e0b', boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)' } : undefined} />
              {firestoreStatus === 'connected' ? 'Cloud 연동' : firestoreStatus === 'checking' ? '연결 확인중' : '시스템 정상'}
            </div>
            <button className="icon-button">
              <Bell size={18} />
              <i>3</i>
            </button>
            <button className="profile">
              <span>김</span>
              <div>
                <strong>김유진</strong>
                <small>방사선사</small>
              </div>
            </button>
          </div>
        </header>
        {active === '환자 조회' && (
          <div className="module-overlay">
            <div className="module-card">
              <div className="module-head">
                <div>
                  <span>REGISTRY / PATIENT SEARCH</span>
                  <h2>환자 조회</h2>
                  <p>Supabase 환자 데이터베이스에서 환자번호, 이름, 또는 연락처로 환자를 조회합니다.</p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
              </div>

              <div className="patient-searchbar">
                <Search size={17} />
                <input
                  autoFocus
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && findPatient()}
                  placeholder="환자번호 / 환자명 / 연락처 검색"
                />
                <button onClick={findPatient} disabled={isSearchingPatient}>
                  {isSearchingPatient ? '조회중...' : '조회'}
                </button>
              </div>

              {isSearchingPatient && (
                <div className="patient-status-bar loading">
                  <span>Supabase에서 환자 데이터를 조회 중입니다...</span>
                </div>
              )}

              {patientSearchError && !isSearchingPatient && (
                <div className="patient-status-bar error">
                  <span>{patientSearchError}</span>
                  <button onClick={loadSupabasePatients}>다시 시도</button>
                </div>
              )}

              <div className="patient-list-header">
                <h4>환자 목록 ({supabasePatients.length}명)</h4>
                <span>행을 클릭하면 상세 정보를 확인할 수 있습니다.</span>
              </div>

              <div className="patient-table-container">
                <table className="patient-table">
                  <thead>
                    <tr>
                      <th>환자번호</th>
                      <th>환자명</th>
                      <th>성별</th>
                      <th>나이</th>
                      <th>생년월일</th>
                      <th>연락처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supabasePatients.map((p) => {
                      const isSelected = selectedSupabasePatient?.id === p.id;
                      return (
                        <tr
                          key={p.id}
                          className={isSelected ? 'selected-row' : ''}
                          onClick={() => handleSelectPatient(p)}
                        >
                          <td><strong>{p.id}</strong></td>
                          <td>{p.name}</td>
                          <td>
                            <span className={`patient-gender-tag ${p.gender === '남' ? 'male' : 'female'}`}>
                              {p.gender || '-'}
                            </span>
                          </td>
                          <td>{p.calculated_age}세</td>
                          <td>{p.birth_date || '-'}</td>
                          <td>{p.phone || '-'}</td>
                        </tr>
                      );
                    })}
                    {supabasePatients.length === 0 && !isSearchingPatient && !patientSearchError && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                          일치하는 환자가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedSupabasePatient ? (
                <div className="patient-detail">
                  <div className="patient-banner">
                    <div className="patient-avatar large">
                      {selectedSupabasePatient.name[0]}
                    </div>
                    <div>
                      <h3>
                        {selectedSupabasePatient.name}{' '}
                        <small>
                          {selectedSupabasePatient.gender || '-'} · {selectedSupabasePatient.calculated_age}세
                        </small>
                      </h3>
                      <p>
                        {selectedSupabasePatient.id} · {selectedSupabasePatient.created_at ? selectedSupabasePatient.created_at.split('T')[0] : '2026-08-29'} 등록
                      </p>
                    </div>
                  </div>
                  <div className="patient-info-grid">
                    <div>
                      <span>환자번호</span>
                      <strong>{selectedSupabasePatient.id}</strong>
                    </div>
                    <div>
                      <span>환자명</span>
                      <strong>{selectedSupabasePatient.name}</strong>
                    </div>
                    <div>
                      <span>성별</span>
                      <strong>{selectedSupabasePatient.gender || '-'}</strong>
                    </div>
                    <div>
                      <span>나이</span>
                      <strong>{selectedSupabasePatient.calculated_age}세</strong>
                    </div>
                    <div>
                      <span>생년월일</span>
                      <strong>{selectedSupabasePatient.birth_date || '-'}</strong>
                    </div>
                    <div>
                      <span>연락처</span>
                      <strong>{selectedSupabasePatient.phone || '-'}</strong>
                    </div>
                  </div>
                  <div className="history-section">
                    <h4>오늘 검사 오더</h4>
                    {exams
                      .filter(
                        (exam) =>
                          exam.id === selectedSupabasePatient.id ||
                          exam.name === selectedSupabasePatient.name,
                      )
                      .map((exam) => (
                        <div className="history-row" key={exam.id}>
                          <span>{exam.time}</span>
                          <strong>{exam.exam}</strong>
                          <small>
                            {exam.modality} · {exam.equipment}
                          </small>
                          <Status s={exam.status} />
                        </div>
                      ))}
                    {exams.filter(
                      (exam) =>
                        exam.id === selectedSupabasePatient.id ||
                        exam.name === selectedSupabasePatient.name,
                    ).length === 0 && (
                      <div style={{ padding: '12px 0', fontSize: '13px', color: '#94a3b8' }}>
                        오늘 예정된 검사 오더가 없습니다.
                      </div>
                    )}
                    <h4>과거 검사 이력</h4>
                    <div className="history-row muted">
                      <span>2026-06-18</span>
                      <strong>Chest PA</strong>
                      <small>X-ray 1 · 판독 완료</small>
                      <Status s="완료" />
                    </div>
                    <div className="history-row muted">
                      <span>2026-03-02</span>
                      <strong>Abdomen US</strong>
                      <small>US-01 · 판독 완료</small>
                      <Status s="완료" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="module-empty">
                  <Search size={27} />
                  <strong>환자를 조회하세요</strong>
                  <span>예: 202608-01482 또는 김민준</span>
                </div>
              )}
            </div>
          </div>
        )}
        {active === '예약 조회' && (
          <div className="module-overlay reservation-page">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>HIS / EMR PRESCRIPTIONS</span>
                  <h2>예약 조회</h2>
                  <p>
                    오늘 전체 예약 {todayReservationCount}건 · HIS/EMR 예약 조회
                  </p>
                </div>
              </div>
              <div className="order-form">
                <label>
                  환자번호 / 환자명
                  <input
                    value={reservationPatient}
                    onChange={(e) => setReservationPatient(e.target.value)}
                    placeholder="환자번호를 입력하세요"
                  />
                </label>
                <label>
                  Modality
                  <select
                    value={reservationModality}
                    onChange={(e) => setReservationModality(e.target.value)}
                  >
                    <option>전체 Modality</option>
                    {[
                      'X-ray',
                      'CT',
                      'MRI',
                      'Ultrasound',
                      'Mammo',
                      'C-arm',
                      'Portable',
                    ].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  검사일
                  <input
                    type="date"
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                  />
                </label>
                <label>
                  검사실
                  <select
                    value={reservationRoom}
                    onChange={(e) => setReservationRoom(e.target.value)}
                  >
                    {equipment
                      .filter((e) => e[0] !== 'Portable X-ray')
                      .map((e) => (
                        <option key={e[0]} value={e[0]}>
                          {roomName(e[0] as string)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="reservation-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        '예약시간',
                        '환자번호',
                        '환자명',
                        '검사명',
                        '검사실',
                        '진료과',
                        '담당의',
                        '예약 상태',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservationRows.map((exam) => (
                      <tr
                        key={exam.id}
                        onClick={() => setReservationSelectedId(exam.id)}
                      >
                        <td>{exam.time}</td>
                        <td>{exam.id}</td>
                        <td>{exam.name}</td>
                        <td>{exam.exam}</td>
                        <td>{roomName(exam.equipment)}</td>
                        <td>{exam.department}</td>
                        <td>{exam.doctor}</td>
                        <td>
                          <Status s={exam.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!reservationRows.length && (
                  <div className="empty">예약 결과가 없습니다.</div>
                )}
              </div>
              {reservationSelectedId && (
                <p className="drawer-note">
                  선택 예약:{' '}
                  {exams.find((e) => e.id === reservationSelectedId)?.name}
                </p>
              )}
            </div>
          </div>
        )}
        {active === '시스템 설정' && (
          <div className="module-overlay settings-page"><div className="module-card order-card"><div className="module-head"><div><span>SYSTEM SETTINGS</span><h2>시스템 설정</h2><p>RIS 운영 환경 및 연동 설정</p></div></div><div className="order-form"><label>병원명<input value={systemSettings.hospital} onChange={(e) => setSystemSettings({ ...systemSettings, hospital: e.target.value })} /></label><label>RIS 시스템명<input value={systemSettings.ris} onChange={(e) => setSystemSettings({ ...systemSettings, ris: e.target.value })} /></label><label>TTS 음성<select><option>젊은 한국어 여성 안내방송</option></select></label><label>TTS 속도<input type="number" step="0.1" min="0.5" max="1.5" value={systemSettings.ttsRate} onChange={(e) => setSystemSettings({ ...systemSettings, ttsRate: e.target.value })} /></label><label>TTS 음높이<input type="number" step="0.1" min="0.5" max="1.5" value={systemSettings.ttsPitch} onChange={(e) => setSystemSettings({ ...systemSettings, ttsPitch: e.target.value })} /></label><label>검사 상태 기본값<select value={systemSettings.defaultStatus} onChange={(e) => setSystemSettings({ ...systemSettings, defaultStatus: e.target.value })}><option>대기</option><option>검사중</option><option>완료</option></select></label><label>알림 설정<select value={systemSettings.alerts ? '사용' : '미사용'} onChange={(e) => setSystemSettings({ ...systemSettings, alerts: e.target.value === '사용' })}><option>사용</option><option>미사용</option></select></label></div><div className="detail-box"><strong>연동 상태</strong><p>HIS / EMR / PACS: 정상 · 시스템 버전 v1.0.0 · 마지막 동기화 10:42:18</p><p>로그인 세션·보안 및 사용자 권한은 병원 정책에 따라 적용됩니다.</p></div><button className="register-order" onClick={() => setNotice('시스템 설정이 저장되었습니다.')}>설정 저장</button></div></div>
        )}
        {active === '장비 관리' && (
          <div className="module-overlay">
            <div className="module-card order-card">
              <div className="module-head"><div><span>EQUIPMENT MANAGEMENT</span><h2>장비 관리</h2><p>장비 상태 및 점검 이력</p></div><button onClick={() => setActive('Dashboard')}><X size={18} /></button></div>
              <div className="reservation-table-wrap"><table><thead><tr>{['장비명','장비 코드','Modality','설치 위치','현재 상태','최근 점검일','다음 점검 예정일','제조사 / 모델명'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{equipment.map((e) => { const name = e[0] as string; const status = equipmentStatuses[name] ?? (String(e[2]).includes('점검') ? '점검예정' : String(e[2]).includes('중') ? '사용중' : '정상'); return <tr key={name} onClick={() => setEquipmentSelected(name)}><td>{name}</td><td>{name}</td><td>{name.includes('CT') ? 'CT' : name.includes('MRI') ? 'MRI' : name.includes('Mammo') ? 'Mammo' : name.includes('Ultrasound') ? 'Ultrasound' : name.includes('C-arm') ? 'C-arm' : name.includes('Portable') ? 'Portable' : 'X-ray'}</td><td>{roomName(name)}</td><td><select value={status} onChange={(ev) => setEquipmentStatuses((s) => ({ ...s, [name]: ev.target.value }))}>{equipmentStatusOptions.map((option) => <option key={option}>{option}</option>)}</select></td><td>2026-08-01</td><td>2026-09-01</td><td>예수사랑병원 표준 장비</td></tr>; })}</tbody></table></div>
              {equipmentSelected && <div className="detail-box"><strong>{equipmentSelected} 상세정보</strong><p>점검 이력: 정기 점검 완료 · 다음 점검 예정일 2026-09-01</p><button onClick={() => setEquipmentSelected(null)}>닫기</button></div>}
            </div>
          </div>
        )}
        {active === '근무 현황' && (
          <div className="module-overlay">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>STAFF ASSIGNMENT</span>
                  <h2>근무 현황</h2>
                  <p>날짜별 장비 배정 현황</p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
              </div>
              <div className="order-form">
                <label>
                  날짜
                  <input
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                  />
                </label>
                <label>
                  방사선사
                  <select
                    value={assignTechName}
                    onChange={(e) => setAssignTechName(e.target.value)}
                  >
                    <option value="">선택</option>
                    {techOptions.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.gender})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  담당 장비
                  <select
                    value={assignEquipment}
                    onChange={(e) => setAssignEquipment(e.target.value)}
                  >
                    {equipment.map((e) => (
                      <option key={e[0]} value={e[0]}>
                        {e[0]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="equipment-list">
                {equipment.map((e) => (
                  <div className="equipment-row" key={e[0]}>
                    <div>
                      <strong>{e[0]}</strong>
                      <small>
                        {assignedTechForEquipment(e[0]) || '미배정 · 경고'}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              <button className="register-order" onClick={assignSave}>
                배정 저장
              </button>
            </div>
          </div>
        )}
        {active === '판독 관리' && (
          <div className="module-overlay">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>RADIOLOGY REPORTING</span>
                  <h2>판독 관리</h2>
                  <p>
                    완료 검사 {reportRows.length}건 · 영상의학과 전문의 판독
                    화면
                  </p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
              </div>
              <div className="advanced-filters">
                <input
                  placeholder="환자명 / 환자번호"
                  value={reportQuery}
                  onChange={(e) => setReportQuery(e.target.value)}
                />
                <select
                  value={reportModality}
                  onChange={(e) => setReportModality(e.target.value)}
                >
                  <option>전체 Modality</option>
                  {[
                    'X-ray',
                    'CT',
                    'MRI',
                    'Ultrasound',
                    'Mammo',
                    'C-arm',
                    'Portable',
                  ].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                >
                  <option>전체 판독상태</option>
                  <option>판독대기</option>
                  <option>판독중</option>
                  <option>판독완료</option>
                </select>
              </div>
              <div className="reservation-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        '환자번호',
                        '환자명',
                        '검사명',
                        'Modality',
                        '검사일시',
                        '진료과',
                        '담당의',
                        '판독 상태',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((exam) => {
                      const examKey = exam.accession || exam.id;
                      return (
                        <tr
                          key={exam.id}
                          onClick={() => setReportSelectedId(exam.id)}
                        >
                          <td>{exam.id}</td>
                          <td>{exam.name}</td>
                          <td>{exam.exam}</td>
                          <td>{exam.modality}</td>
                          <td>
                            {exam.date} {exam.time}
                          </td>
                          <td>{exam.department}</td>
                          <td>{exam.doctor}</td>
                          <td>
                            <Status
                              s={exam.interpretationStatus || (reportTexts[examKey] || reportTexts[exam.id] ? '판독완료' : '판독대기')}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {reportSelected && (
                <div className="report-editor">
                  <p>
                    {reportSelected.name} · {reportSelected.exam} ·{' '}
                    <button
                      onClick={() => setNotice('PACS 영상 조회를 시작합니다.')}
                    >
                      PACS 영상 조회
                    </button>
                  </p>
                  <textarea
                    rows={8}
                    disabled={reportRole !== '전문의' || isReportSaving}
                    value={reportTexts[reportSelected.accession || reportSelected.id] ?? reportTexts[reportSelected.id] ?? ''}
                    onChange={(e) => {
                      const targetKey = reportSelected.accession || reportSelected.id;
                      setReportTexts({
                        ...reportTexts,
                        [targetKey]: e.target.value,
                        [reportSelected.id]: e.target.value,
                      });
                    }}
                    placeholder={
                      reportRole === '전문의'
                        ? '판독문을 작성하세요.'
                        : '방사선사는 판독 결과만 조회할 수 있습니다.'
                    }
                  />
                  <button
                    className="register-order"
                    disabled={reportRole !== '전문의' || isReportSaving}
                    onClick={() => handleSaveReport(reportSelected.accession || reportSelected.id, reportTexts[reportSelected.accession || reportSelected.id] ?? reportTexts[reportSelected.id] ?? '')}
                  >
                    {isReportSaving ? '판독 저장 중...' : '판독 완료'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {false && active === '검사 오더' && (
          <div className="module-overlay">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>ORDER ENTRY / RADIOLOGY</span>
                  <h2>신규 검사 오더</h2>
                  <p>검사 처방을 등록하면 오늘 Worklist에 자동 반영됩니다.</p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
              </div>
              <div className="order-patient">
                <span>환자</span>
                <strong>{(patientResult ?? exams[0]).name}</strong>
                <small>{(patientResult ?? exams[0]).id}</small>
                <button onClick={() => setActive('환자 조회')}>
                  환자 변경
                </button>
              </div>
              <div className="order-form">
                <label>
                  Modality
                  <select
                    value={orderExam.modality}
                    onChange={(e) =>
                      setOrderExam({ ...orderExam, modality: e.target.value })
                    }
                  >
                    {[
                      'X-ray',
                      'CT',
                      'MRI',
                      'Ultrasound',
                      'Mammo',
                      'C-arm',
                      'Portable',
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  검사명
                  <input
                    value={orderExam.exam}
                    onChange={(e) =>
                      setOrderExam({ ...orderExam, exam: e.target.value })
                    }
                  />
                </label>
                <label>
                  진료과
                  <select
                    value={orderExam.department}
                    onChange={(e) =>
                      setOrderExam({ ...orderExam, department: e.target.value })
                    }
                  >
                    {[
                      '호흡기내과',
                      '신경외과',
                      '정형외과',
                      '소화기내과',
                      '유방외과',
                      '건강검진센터',
                      '수술실',
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  담당의
                  <input
                    value={orderExam.doctor}
                    onChange={(e) =>
                      setOrderExam({ ...orderExam, doctor: e.target.value })
                    }
                  />
                </label>
                <fieldset>
                  <legend>우선순위</legend>
                  <label className="priority-option">
                    <input
                      type="radio"
                      checked={orderExam.priority === '일반'}
                      onChange={() =>
                        setOrderExam({ ...orderExam, priority: '일반' })
                      }
                    />{' '}
                    일반
                  </label>
                  <label className="priority-option emergency">
                    <input
                      type="radio"
                      checked={orderExam.priority === '응급'}
                      onChange={() =>
                        setOrderExam({ ...orderExam, priority: '응급' })
                      }
                    />{' '}
                    응급
                  </label>
                </fieldset>
              </div>
              <div className="order-note">
                <AlertTriangle size={14} /> 건강검진용 X-ray는 별도 검사실로
                자동 배정됩니다.
              </div>
              <button className="register-order" onClick={registerOrder}>
                검사 오더 등록
              </button>
            </div>
          </div>
        )}
        {(active === 'Dashboard' || active === '검사 Worklist') && <div className={`content ${active === '검사 Worklist' ? 'worklist-page' : ''}`}>
          <div className="page-heading">
            <div>
              <h2>오늘의 검사 현황</h2>
              <p>2026년 8월 29일 토요일 · 오전 근무</p>
            </div>
            <div className="sync">
              <i />
              최종 동기화 10:42:18
            </div>
          </div>
          {worklistError && (
            <div
              className="patient-status-bar error"
              style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>{worklistError}</span>
              <button
                type="button"
                onClick={loadSupabaseWorklist}
                disabled={isWorklistLoading}
              >
                {isWorklistLoading ? '재시도 중...' : '다시 시도'}
              </button>
            </div>
          )}
          <section className="kpi-grid">
            {liveKpis.map((k) => (
              <article className={`kpi-card ${k[3]}`} key={k[0]}>
                <div>
                  {k[0]}
                  <Activity size={17} />
                </div>
                <strong>
                  {k[1]}
                  <small>건</small>
                </strong>
                {k[2] && <p>{k[2]}</p>}
                <i>
                  <b />
                </i>
              </article>
            ))}
          </section>
          <div
            className={`dashboard-grid ${active === '검사 Worklist' ? 'worklist-full' : ''}`}
          >
            <section className="panel worklist-panel">
              <div className="panel-header">
                <div>
                  <h3>오늘 검사 Worklist</h3>
                  <p>대기·검사중 환자의 오늘 검사 목록입니다.</p>
                </div>
                <button className="more-button">
                  <MoreHorizontal size={19} />
                </button>
              </div>
              <div className="table-toolbar">
                <div className="tabs">
                  <button
                    className={worklistView === 'active' ? 'selected' : ''}
                    onClick={() => setWorklistView('active')}
                  >
                    진행 Worklist{' '}
                    <span>
                      {
                        todayExams.filter((exam) =>
                          ['대기', '검사중'].includes(exam.status),
                        ).length
                      }
                    </span>
                  </button>
                  <button
                    className={worklistView === 'urgent' ? 'selected' : ''}
                    onClick={() => setWorklistView('urgent')}
                  >
                    응급{' '}
                    <span>
                      {
                        todayExams.filter(
                          (exam) =>
                            exam.urgent &&
                            ['대기', '검사중'].includes(exam.status),
                        ).length
                      }
                    </span>
                  </button>
                  <button
                    className={worklistView === 'unassigned' ? 'selected' : ''}
                    onClick={() => setWorklistView('unassigned')}
                  >
                    미배정{' '}
                    <span>
                      {
                        todayExams.filter(
                          (exam) =>
                            !exam.tech &&
                            ['대기', '검사중'].includes(exam.status),
                        ).length
                      }
                    </span>
                  </button>
                  <button
                    className={worklistView === 'completed' ? 'selected' : ''}
                    onClick={() => {
                      setWorklistView('completed');
                      setExamStatus('전체 상태');
                    }}
                  >
                    완료 검사{' '}
                    <span>
                      {todayExams.filter((exam) => exam.status === '완료').length}
                    </span>
                  </button>
                </div>
                <div className="table-actions">
                  <label>
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="환자번호 / 환자명"
                    />
                  </label>
                </div>
              </div>
              <div
                className="device-tabs"
                role="tablist"
                aria-label="장비별 Worklist"
              >
                {DEVICE_TABS.map(([label, value]) => (
                  <button
                    key={value}
                    className={deviceTab === value ? 'selected' : ''}
                    onClick={() => {
                      setDeviceTab(value);
                      setRoom('전체 장비');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="advanced-filters">
                <label className="date-filter">
                  <CalendarDays size={14} />
                  <input
                    aria-label="검사일자"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <div className="select-filter">
                  <Radio size={14} />
                  <select
                    aria-label="Modality 필터"
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                  >
                    <option>전체 Modality</option>
                    {[
                      'X-ray',
                      'CT',
                      'MRI',
                      'Ultrasound',
                      'Mammo',
                      'C-arm',
                      'Portable',
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="select-filter">
                  <Activity size={14} />
                  <select
                    aria-label="검사상태 필터"
                    value={examStatus}
                    onChange={(e) => setExamStatus(e.target.value)}
                  >
                    <option>전체 상태</option>
                    {['대기', '검사중', '완료'].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="select-filter equipment-filter">
                  <MonitorCog size={14} />
                  <select
                    aria-label="장비 필터"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  >
                    <option>전체 장비</option>
                    {equipment.map((item) => (
                      <option key={item[0] as string}>{item[0]}</option>
                    ))}
                  </select>
                </div>
                <label className="include-completed">
                  <input
                    type="checkbox"
                    checked={includeCompleted}
                    onChange={(e) => {
                      setIncludeCompleted(e.target.checked);
                      if (e.target.checked && worklistView === 'completed')
                        setWorklistView('active');
                    }}
                  />
                  <span>완료 포함</span>
                </label>
                <button
                  className="reset-filter"
                  onClick={() => {
                    setQuery('');
                    setModality('전체 Modality');
                    setExamStatus('전체 상태');
                    setRoom('전체 장비');
                    setWorklistView('active');
                    setIncludeCompleted(false);
                  }}
                >
                  초기화
                </button>
              </div>
              {worklistError && (
                <div
                  className="patient-status-bar error"
                  style={{ margin: '12px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>{worklistError}</span>
                  <button
                    type="button"
                    onClick={loadSupabaseWorklist}
                    disabled={isWorklistLoading}
                  >
                    {isWorklistLoading ? '재시도 중...' : '다시 시도'}
                  </button>
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        '구분',
                        '검사일시',
                        '환자번호',
                        '환자명',
                        '검사명',
                        'Modality',
                        '검사실',
                        '담당 방사선사',
                        '검사 상태',
                        '호출 상태',
                        '호출 시간',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((exam) => (
                      <tr
                        key={exam.id}
                        onClick={() => setSelectedId(exam.id)}
                        className={
                          exam.equipment === '건강검진 X-ray'
                            ? 'screening-row'
                            : ''
                        }
                      >
                        <td>
                          {exam.urgent ? (
                            <span className="urgent-flag">
                              <AlertTriangle size={11} />
                              응급
                            </span>
                          ) : exam.equipment === '건강검진 X-ray' ? (
                            <span className="screening-flag">검진</span>
                          ) : (
                            <span className="routine-flag">일반</span>
                          )}
                        </td>
                        <td>
                          <strong className="exam-time">
                            {exam.date.slice(5)} {exam.time}
                          </strong>
                        </td>
                        <td>
                          <button
                            className="patient-id"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {exam.id}
                          </button>
                        </td>
                        <td>
                          {exam.name}
                          <small className="patient-meta">
                            {exam.sex}/{calculateAge(exam.birthDate, exam.age)}
                          </small>
                        </td>
                        <td>{exam.exam}</td>
                        <td>{exam.modality}</td>
                        <td>{roomName(exam.equipment)}</td>
                        <td>
                          {assignedTechFor(exam) || (
                            <span className="unassigned">미배정</span>
                          )}
                        </td>
                        <td>
                          <Status s={exam.status} />
                        </td>
                        {CALLABLE_MODALITIES.includes(exam.modality) &&
                        exam.status === '대기' ? (
                          <>
                            <td>
                              <button
                                className={`call-action ${exam.callStatus === '호출 완료' ? 'called' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakCall(exam);
                                }}
                              >
                                <Volume2 size={12} />
                                {exam.callStatus ? '재호출' : '호출'}
                              </button>
                            </td>
                            <td className="call-time">
                              {exam.callTime ?? '-'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td aria-hidden="true" />
                            <td aria-hidden="true" />
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <div className="empty">검색 결과가 없습니다.</div>
                )}
              </div>
              <div className="table-footer">
                <span>검색 결과 {rows.length}건 · 전체 {todayExams.length}건</span>
              </div>
            </section>
            {active !== '검사 Worklist' && (
              <aside className="right-rail">
                <section className="panel">
                  <div className="panel-header compact">
                    <div>
                      <h3>장비 현황</h3>
                      <p>총 10대 · 9대 가용</p>
                    </div>
                    <button className="text-button">전체보기</button>
                  </div>
                  <div className="equipment-list">
                    {equipment.map((e) => (
                      <div className="equipment-row" key={e[0] as string}>
                        <span className={!e[3] ? 'warning' : ''}>
                          <MonitorCog size={16} />
                        </span>
                        <div>
                          <strong>{e[0]}</strong>
                          <small>{equipmentStatuses[e[0] as string] ?? e[2]}</small>
                        </div>
                        <b aria-hidden="true" />
                        <i className={!e[3] ? 'warn' : ''} />
                      </div>
                    ))}
                  </div>
                </section>
                {false && (
                  <section className="panel">
                    <div className="panel-header compact">
                      <div>
                        <h3>오늘의 방사선사 배치</h3>
                        <p>근무자 8명 · 현재 7명</p>
                      </div>
                      <button className="text-button">배정관리</button>
                    </div>
                    <div className="staff-summary">
                      <div>
                        <strong>7명</strong>
                        <small>배치 완료 인원</small>
                      </div>
                      <div>
                        <strong>2대</strong>
                        <small>미배정 장비 수</small>
                      </div>
                      <div>
                        <strong>1명</strong>
                        <small>휴무/부재 인원</small>
                      </div>
                      <p className="form-error">
                        ⚠ 미배정 또는 중복 배정 발생 시 확인 필요
                      </p>
                    </div>
                    <div className="staff-list">
                      {staff.map((s, i) => (
                        <div className="staff-row" key={s[0]}>
                          <div className={`avatar a${i}`}>{s[0][0]}</div>
                          <div>
                            <strong>{s[0]}</strong>
                            <small>{s[2]}</small>
                          </div>
                          <span>{s[1]}</span>
                        </div>
                      ))}
                    </div>
                    <button className="staff-more">
                      <UsersRound size={15} />
                      근무자 2명 더보기
                    </button>
                  </section>
                )}
              </aside>
            )}
          </div>
        </div>}
      </section>
      {selected && (
        <>
          <button
            className="drawer-backdrop"
            aria-label="상세정보 닫기"
            onClick={() => setSelectedId(null)}
          />
          <aside className="exam-drawer" aria-label="환자 검사 상세정보">
            <div className="drawer-header">
              <div>
                <span className="drawer-kicker">EXAM DETAIL</span>
                <h3>검사 상세정보</h3>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="닫기">
                <X size={19} />
              </button>
            </div>
            <div className="patient-summary">
              <div className="patient-avatar">{selected.name[0]}</div>
              <div>
                <h4>
                  {selected.name}{' '}
                  <small>
                    {selected.sex}/{calculateAge(selected.birthDate, selected.age)}세
                  </small>
                </h4>
                <p>
                  {selected.id} · {selected.department}
                </p>
              </div>
              {selected.urgent && (
                <span className="drawer-urgent">
                  <AlertTriangle size={12} />
                  응급검사
                </span>
              )}
            </div>
            <section className="drawer-section">
              <h5>검사 정보</h5>
              <dl>
                <div>
                  <dt>검사명</dt>
                  <dd>{selected.exam}</dd>
                </div>
                <div>
                  <dt>Accession No.</dt>
                  <dd>{selected.accession}</dd>
                </div>
                <div>
                  <dt>검사일시</dt>
                  <dd>
                    {selected.date} {selected.time}
                  </dd>
                </div>
                <div>
                  <dt>Modality</dt>
                  <dd>{selected.modality}</dd>
                </div>
                <div>
                  <dt>검사실</dt>
                  <dd>{roomName(selected.equipment)}</dd>
                </div>
                <div>
                  <dt>장비 코드</dt>
                  <dd>{selected.equipment}</dd>
                </div>
                <div>
                  <dt>처방의</dt>
                  <dd>{selected.doctor}</dd>
                </div>
              </dl>
            </section>
            {(selected.modality === 'CT' || selected.modality === 'MRI' || isOrCarm || (isUS && prepItems.length > 0)) && (
              <section className="drawer-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h5 style={{ margin: 0 }}>{isOrCarm ? '수술 전 안전 확인사항' : isUS ? '초음파 사전 준비사항' : '검사 전 확인사항'}</h5>
                  {isChecklistSaving ? (
                    <small style={{ color: '#2563eb', fontWeight: 500 }}>DB 저장 중...</small>
                  ) : isChecklistLoading ? (
                    <small style={{ color: '#64748b', fontWeight: 500 }}>DB 동기화 중...</small>
                  ) : null}
                </div>
                <strong
                  className={prepComplete ? 'status-ok' : 'status-warning'}
                >
                  {prepComplete ? '검사 가능' : '확인 필요'}
                </strong>
                <div className="prep-check-list">
                  {prepItems.map((item) => {
                    const currentVal = prepChecks[`${selected.id}-${item}`] ?? '추가 확인 필요';
                    const isCleared = isOrCarm
                      ? isOrCarmCleared
                      : currentVal === '확인 완료' || currentVal === '해당 없음' || currentVal === '해당없음';

                    return (
                      <div key={item} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className={!isCleared ? 'warning' : ''}>
                          <span>{item}</span>
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              const updated = {
                                ...prepChecks,
                                [`${selected.id}-${item}`]: newVal,
                              };
                              setPrepChecks(updated);
                              saveChecklistForExam(selected, updated);
                            }}
                          >
                            <option>확인 완료</option>
                            {isOrCarm ? (
                              <option>해당 없음/의료진 확인</option>
                            ) : (
                              <option>해당 없음</option>
                            )}
                            <option>추가 확인 필요</option>
                            <option>미확인</option>
                          </select>
                          {!isCleared && <AlertTriangle size={13} />}
                        </label>

                        {/* 수술실 C-arm 의료진 임상 확인 정보 입력 박스 */}
                        {isOrCarm && currentVal === '해당 없음/의료진 확인' && (
                          <div
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #d9e2ec',
                              borderRadius: '6px',
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              fontSize: '12px',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📋 수술팀/마취과 임상 확인 기록</span>
                              {selected.urgent && (
                                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                                  응급수술
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
                                확인 의료진 (의사 성명)*
                                <input
                                  type="text"
                                  placeholder="예: 김마취 과장"
                                  value={orFastingVerifications[selected.id]?.verifiedDoctor ?? ''}
                                  onChange={(e) => {
                                    const updatedVerif = {
                                      verifiedDoctor: e.target.value,
                                      departmentOrRole: orFastingVerifications[selected.id]?.departmentOrRole ?? '마취통증의학과',
                                      clinicalReason: orFastingVerifications[selected.id]?.clinicalReason ?? '',
                                      isEmergencySurgery: selected.urgent || orFastingVerifications[selected.id]?.isEmergencySurgery || false,
                                    };
                                    setOrFastingVerifications({
                                      ...orFastingVerifications,
                                      [selected.id]: updatedVerif,
                                    });
                                    saveChecklistForExam(selected, prepChecks, updatedVerif);
                                  }}
                                  style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
                                />
                              </label>
                              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
                                진료과 / 역할
                                <input
                                  type="text"
                                  placeholder="마취통증의학과 / 집도의"
                                  value={orFastingVerifications[selected.id]?.departmentOrRole ?? '마취통증의학과'}
                                  onChange={(e) => {
                                    const updatedVerif = {
                                      verifiedDoctor: orFastingVerifications[selected.id]?.verifiedDoctor ?? '',
                                      departmentOrRole: e.target.value,
                                      clinicalReason: orFastingVerifications[selected.id]?.clinicalReason ?? '',
                                      isEmergencySurgery: selected.urgent || orFastingVerifications[selected.id]?.isEmergencySurgery || false,
                                    };
                                    setOrFastingVerifications({
                                      ...orFastingVerifications,
                                      [selected.id]: updatedVerif,
                                    });
                                    saveChecklistForExam(selected, prepChecks, updatedVerif);
                                  }}
                                  style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
                                />
                              </label>
                            </div>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
                              임상 사유 (응급수술 마취평가 및 기도 확보 등)*
                              <input
                                type="text"
                                placeholder="예: 응급수술로 마취과 사전평가 및 흡인 방지 처치 완료 후 진행"
                                value={orFastingVerifications[selected.id]?.clinicalReason ?? ''}
                                onChange={(e) => {
                                  const updatedVerif = {
                                    verifiedDoctor: orFastingVerifications[selected.id]?.verifiedDoctor ?? '',
                                    departmentOrRole: orFastingVerifications[selected.id]?.departmentOrRole ?? '마취통증의학과',
                                    clinicalReason: e.target.value,
                                    isEmergencySurgery: selected.urgent || orFastingVerifications[selected.id]?.isEmergencySurgery || false,
                                  };
                                  setOrFastingVerifications({
                                    ...orFastingVerifications,
                                    [selected.id]: updatedVerif,
                                  });
                                  saveChecklistForExam(selected, prepChecks, updatedVerif);
                                }}
                                style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
                              />
                            </label>
                            <small style={{ color: '#64748b' }}>
                              * 금식 미준수 환자의 수술 진행은 수술팀 및 마취과의 최종 임상 판단에 따르며 기록 후 검사 시작이 활성화됩니다.
                            </small>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            <section className="drawer-section prescription-section">
              <h5>
                처방 정보 <small>HIS / EMR · 읽기 전용</small>
              </h5>
              <dl className="detail-grid">
                <div>
                  <dt>처방일시</dt>
                  <dd>
                    {selected.date} {selected.time}
                  </dd>
                </div>
                <div>
                  <dt>처방의</dt>
                  <dd>{selected.doctor}</dd>
                </div>
                <div>
                  <dt>진료과</dt>
                  <dd>{selected.department}</dd>
                </div>
                <div>
                  <dt>검사 처방명</dt>
                  <dd>{selected.exam}</dd>
                </div>
                <div>
                  <dt>검사 목적 / 임상정보</dt>
                  <dd>{selected.memo || '임상정보 없음'}</dd>
                </div>
                <div>
                  <dt>우선순위</dt>
                  <dd>{selected.urgent ? '응급' : '일반'}</dd>
                </div>
                <div>
                  <dt>처방 메모</dt>
                  <dd>{selected.memo || '처방 메모 없음'}</dd>
                </div>
              </dl>
            </section>
            <section className="drawer-section">
              <h5>검사 진행</h5>
              <div className="drawer-status-line">
                <span>현재 상태</span>
                <Status s={selected.status} />
              </div>
              <label className="tech-assignment">
                <span>담당 방사선사</span>
                <select
                  value={selected.tech}
                  onChange={(e) => assignTech(selected, e.target.value)}
                >
                  <option value="">미배정</option>
                  {techOptions.map((tech) => {
                    const occupied = exams.some(
                      (item) =>
                        item.id !== selected.id &&
                        item.tech === tech.name &&
                        item.date === selected.date &&
                        item.time === selected.time &&
                        item.status !== '완료' &&
                        item.status !== '완료',
                    );
                    const mammoBlocked =
                      selected.modality === 'Mammo' && tech.gender !== '여';
                    return (
                      <option
                        key={tech.name}
                        value={tech.name}
                        disabled={occupied || mammoBlocked}
                      >
                        {tech.name} ({tech.gender})
                        {occupied ? ' · 동시간 배정' : ''}
                        {mammoBlocked ? ' · Mammo 배정 불가' : ''}
                      </option>
                    );
                  })}
                </select>
              </label>
              {selected.modality === 'Mammo' && (
                <p className="assignment-rule">
                  <ShieldCheck size={13} />
                  Mammo 여성 방사선사 기본 배정 규칙 적용 중
                </p>
              )}
            </section>
            {CALLABLE_MODALITIES.includes(selected.modality) &&
              selected.status === '대기' && (
                <section className="drawer-section call-section">
                  <h5>환자 호출</h5>
                  <div className="call-detail">
                    <span>호출 상태</span>
                    <strong>{selected.callStatus ?? '미호출'}</strong>
                    <small>
                      {selected.callTime
                        ? `마지막 호출 ${selected.callTime}`
                        : '접수 완료 후 대기열에 등록됩니다.'}
                    </small>
                    {(callQueues[selected.equipment]?.indexOf(selected.id) ??
                      -1) >= 0 && (
                      <small>
                        검사실 대기 순번{' '}
                        {callQueues[selected.equipment].indexOf(selected.id) +
                          1}
                        번
                      </small>
                    )}
                  </div>
                  <button
                    className="recall-button"
                    onClick={() => speakCall(selected)}
                  >
                    <Volume2 size={14} />
                    {callingId === selected.id
                      ? '방송 중'
                      : selected.callStatus
                        ? '재호출'
                        : '호출'}
                  </button>
                </section>
              )}
            <section className="drawer-section memo-section">
              <h5>검사 메모</h5>
              <p>{selected.memo}</p>
            </section>
            <div className="drawer-actions">
              <button
                className="action-start"
                disabled={!canStartExam || isActionLoading}
                title={
                  selected.status !== '대기'
                    ? `'대기' 상태인 검사만 시작할 수 있습니다. (현재: ${selected.status})`
                    : isOrCarm && !prepComplete
                      ? '수술실 C-arm은 수술 전 금식 확인(확인 완료 또는 수술팀/마취과 의료진 확인 기록)이 완료되어야 시작 가능합니다.'
                      : isUS && !prepComplete
                        ? '초음파 프로토콜 필수 준비사항(금식/방광 충만) 확인이 완료되지 않았습니다.'
                        : isSafetyModality && !prepComplete
                          ? `${selected.modality} 필수 안전 체크리스트 확인이 완료되지 않았습니다.`
                          : '검사를 시작합니다.'
                }
                onClick={() => handleStartExam(selected.accession || selected.id)}
              >
                <Play size={14} />
                {isActionLoading ? '처리 중...' : '검사 시작'}
              </button>
              <button
                className="action-complete"
                disabled={!canCompleteExam || isActionLoading}
                title={
                  selected.status !== '검사중'
                    ? `'검사중' 상태인 검사만 완료할 수 있습니다. (현재: ${selected.status})`
                    : '검사를 완료하고 판독대기 상태로 전환합니다.'
                }
                onClick={() => handleCompleteExam(selected.accession || selected.id)}
              >
                <CheckCircle2 size={14} />
                {isActionLoading ? '처리 중...' : '검사 완료'}
              </button>
            </div>
          </aside>
        </>
      )}
      {notice && (
        <div className="worklist-toast" role="status">
          {notice}
        </div>
      )}
    </main>
  );
}
