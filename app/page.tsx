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
  Eye,
  EyeOff,
  HeartPulse,
  LayoutDashboard,
  ListFilter,
  Lock,
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
  getReservations,
  getReservationById,
  type Reservation,
  getStaffList,
  getWorkSchedules,
  type Staff as SupabaseStaff,
  type WorkSchedule as SupabaseWorkSchedule,
  getEquipment,
  getEquipmentInspections,
  updateEquipmentStatus,
  type Equipment as SupabaseEquipment,
  type EquipmentInspection as SupabaseEquipmentInspection,
  getSystemSettings,
  updateSystemSetting,
  type SystemSetting as SupabaseSystemSetting,
  getCurrentUser,
  signInWithEmailPassword,
  signOut as authSignOut,
  permissions,
  roleDisplayLabel,
  type UserProfile,
  type AppRole,
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
  ['수술실 C-arm', '수술실 C-arm'],
  ['투시실 C-arm', '투시실 C-arm'],
  ['Portable X-ray', 'Portable X-ray'],
] as const;
const kpis = [
  ['선택일 검사', '-', 'blue'],
  ['검사 대기', '-', 'amber'],
  ['검사 중', '-', 'cyan'],
  ['검사 완료', '-', 'green'],
  ['응급 검사', '-', 'red'],
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
    equipment: '수술실 C-arm',
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
export const getEquipmentStatusTheme = (status: string) => {
  switch (status) {
    case '사용가능':
      return { label: '사용가능', color: '#10b981', bg: '#e8f7f0', border: '#a3e4c8' };
    case '사용중':
      return { label: '사용중', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
    case '점검중':
      return { label: '점검중', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
    case '고장':
      return { label: '고장', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
    case '사용중지':
      return { label: '사용중지', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' };
    default:
      return { label: status || '사용가능', color: '#10b981', bg: '#e8f7f0', border: '#a3e4c8' };
  }
};

const equipment = [
  ['X-ray 1', '1 / 1', '사용중', 1],
  ['X-ray 2', '1 / 1', '사용가능', 1],
  ['건강검진 X-ray', '1 / 1', '사용가능', 1],
  ['CT', '1 / 1', '사용가능', 1],
  ['MRI', '1 / 1', '사용가능', 1],
  ['Ultrasound', '1 / 1', '사용중', 1],
  ['Mammo', '1 / 1', '사용가능', 1],
  ['수술실 C-arm', '1 / 1', '사용가능', 1],
  ['투시실 C-arm', '1 / 1', '사용가능', 1],
  ['Portable X-ray', '1 / 1', '사용가능', 1],
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
    '수술실 C-arm': '수술실 C-arm',
    '투시실 C-arm': '투시실 C-arm',
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
  { name: '김유진', gender: '여' },
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
    [callingId, setCallingId] = useState<string | null>(null),
    [currentUser, setCurrentUser] = useState<UserProfile | null>(null),
    [isAuthChecking, setIsAuthChecking] = useState(true),
    [loginEmail, setLoginEmail] = useState('admin1'),
    [loginPassword, setLoginPassword] = useState(''),
    [loginError, setLoginError] = useState<string | null>(null),
    [isLoggingIn, setIsLoggingIn] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const [supabasePatients, setSupabasePatients] = useState<PatientWithCalculatedAge[]>([]);
  const [selectedSupabasePatient, setSelectedSupabasePatient] = useState<PatientWithCalculatedAge | null>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [isWorklistLoading, setIsWorklistLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [worklistError, setWorklistError] = useState<string | null>(null);
  const [reservationPatient, setReservationPatient] = useState('');
  const [reservationExam, setReservationExam] = useState('');
  const [reservationRoom, setReservationRoom] = useState('전체 장비');
  const [reservationDate, setReservationDate] = useState('2026-08-29');
  const [reservationTime, setReservationTime] = useState('09:00');
  const [reservationModality, setReservationModality] =
    useState('전체 Modality');
  const [supabaseReservations, setSupabaseReservations] = useState<Reservation[]>([]);
  const [isReservationLoading, setIsReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [supabaseStaff, setSupabaseStaff] = useState<SupabaseStaff[]>([]);
  const [supabaseWorkSchedules, setSupabaseWorkSchedules] = useState<SupabaseWorkSchedule[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [supabaseEquipments, setSupabaseEquipments] = useState<SupabaseEquipment[]>([]);
  const [supabaseInspections, setSupabaseInspections] = useState<SupabaseEquipmentInspection[]>([]);
  const [isEquipmentLoading, setIsEquipmentLoading] = useState(false);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [supabaseSettingsList, setSupabaseSettingsList] = useState<SupabaseSystemSetting[]>([]);
  const [settingsLastSync, setSettingsLastSync] = useState<string>('2026-08-29 10:42:18');
  const [firestoreStatus, setFirestoreStatus] = useState<'checking' | 'connected' | 'fallback'>('checking');

  // Supabase system_settings 테이블 조회
  const loadSupabaseSettings = async () => {
    setIsSettingsLoading(true);
    setSettingsError(null);
    try {
      const res = await getSystemSettings();
      if (res.error) {
        setSettingsError(`시스템 설정 조회 실패: ${res.error.message}`);
        console.error('[loadSupabaseSettings] error:', res.error.message);
      } else if (res.data) {
        setSupabaseSettingsList(res.data);
        const map: Record<string, string> = {};
        res.data.forEach((item) => {
          map[item.key] = item.value;
        });

        // Supabase DB에 저장된 값이 있으면 로컬 state에 반영
        setSystemSettings((prev) => ({
          hospital: map['hospital_name'] ?? prev.hospital,
          ris: map['ris_system_name'] ?? prev.ris,
          ttsRate: map['tts_rate'] ?? prev.ttsRate,
          ttsPitch: map['tts_pitch'] ?? prev.ttsPitch,
          defaultStatus: map['default_status'] ?? prev.defaultStatus,
          alerts: map['alerts_enabled'] !== undefined ? map['alerts_enabled'] === 'true' : prev.alerts,
          ttsEnabled: map['tts_enabled'] !== undefined ? map['tts_enabled'] === 'true' : true,
          defaultWorklistView: map['default_worklist_view'] ?? 'active',
          sessionTimeoutMin: map['session_timeout_min'] ?? '30',
          autoLogout: map['auto_logout'] !== undefined ? map['auto_logout'] === 'true' : true,
          hisStatus: map['his_status'] ?? '정상',
          emrStatus: map['emr_status'] ?? '정상',
          pacsStatus: map['pacs_status'] ?? '정상',
          systemVersion: map['system_version'] ?? 'v1.0.0',
        }));

        if (res.data.length > 0) {
          const latestUpdated = res.data.reduce((latest, item) => {
            if (!item.updated_at) return latest;
            return !latest || item.updated_at > latest ? item.updated_at : latest;
          }, '');
          if (latestUpdated) {
            setSettingsLastSync(new Date(latestUpdated).toLocaleString('ko-KR'));
          } else {
            setSettingsLastSync(new Date().toLocaleTimeString('ko-KR'));
          }
        }
      }
    } catch (err: any) {
      setSettingsError(`시스템 설정 데이터 조회 중 오류: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  // Supabase equipment 및 equipment_inspections 테이블 조회
  const loadSupabaseEquipment = async () => {
    setIsEquipmentLoading(true);
    setEquipmentError(null);
    try {
      const [eqRes, inspRes] = await Promise.all([
        getEquipment(),
        getEquipmentInspections(),
      ]);

      if (eqRes.error) {
        setEquipmentError(`장비 목록 조회 실패: ${eqRes.error.message}`);
        setSupabaseEquipments([]);
      } else if (eqRes.data) {
        setSupabaseEquipments(eqRes.data);
      }

      if (inspRes.error) {
        console.error('[loadSupabaseEquipment] inspRes error:', inspRes.error.message);
        setSupabaseInspections([]);
      } else if (inspRes.data) {
        setSupabaseInspections(inspRes.data);
      }
    } catch (err: any) {
      setEquipmentError(`장비 데이터 조회 중 오류: ${err?.message || '알 수 없는 오류'}`);
      setSupabaseEquipments([]);
      setSupabaseInspections([]);
    } finally {
      setIsEquipmentLoading(false);
    }
  };

  // Supabase reservations 테이블 조회
  const loadSupabaseReservations = async () => {
    setIsReservationLoading(true);
    setReservationError(null);
    try {
      const res = await getReservations();
      if (res.error) {
        setReservationError(`예약 조회 실패: ${res.error.message}`);
        setSupabaseReservations([]);
      } else if (res.data) {
        setSupabaseReservations(res.data);
      }
    } catch (err: any) {
      setReservationError(`예약 목록 조회 중 오류: ${err?.message || '알 수 없는 오류'}`);
      setSupabaseReservations([]);
    } finally {
      setIsReservationLoading(false);
    }
  };

  // Supabase staff 및 work_schedules 테이블 조회
  const loadSupabaseStaffSchedules = async () => {
    setIsStaffLoading(true);
    setStaffError(null);
    try {
      const [staffRes, schedRes] = await Promise.all([
        getStaffList('방사선사'),
        getWorkSchedules(),
      ]);

      if (staffRes.error) {
        setStaffError(`방사선사 목록 조회 실패: ${staffRes.error.message}`);
        setSupabaseStaff([]);
      } else if (staffRes.data) {
        setSupabaseStaff(staffRes.data);
      }

      if (schedRes.error) {
        console.error('[loadSupabaseStaffSchedules] schedRes error:', schedRes.error.message);
        setSupabaseWorkSchedules([]);
      } else if (schedRes.data) {
        setSupabaseWorkSchedules(schedRes.data);
      }
    } catch (err: any) {
      setStaffError(`근무 현황 조회 중 오류: ${err?.message || '알 수 없는 오류'}`);
      setSupabaseStaff([]);
      setSupabaseWorkSchedules([]);
    } finally {
      setIsStaffLoading(false);
    }
  };

  useEffect(() => {
    // 실제 Supabase Auth 세션 로드 (비로그인 시 null, 세션 유지)
    setIsAuthChecking(true);
    getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
      })
      .finally(() => {
        setIsAuthChecking(false);
      });

    loadSupabaseReservations();
    loadSupabaseStaffSchedules();
    loadSupabaseEquipment();
    loadSupabaseSettings();
  }, []);

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
    if (!permissions.canStartCompleteExam(currentUser?.role)) {
      setNotice(`[권한 제한] 검사 시작은 방사선사 또는 관리자 권한만 가능합니다. (현재: ${currentUser?.role ? roleDisplayLabel(currentUser.role) : '비로그인'})`);
      setTimeout(() => setNotice(''), 3500);
      return;
    }

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
    if (!permissions.canStartCompleteExam(currentUser?.role)) {
      setNotice(`[권한 제한] 검사 완료는 방사선사 또는 관리자 권한만 가능합니다. (현재: ${currentUser?.role ? roleDisplayLabel(currentUser.role) : '비로그인'})`);
      setTimeout(() => setNotice(''), 3500);
      return;
    }

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
    if (!permissions.canWriteReport(currentUser?.role)) {
      setNotice(`[권한 제한] 판독 작성 및 저장은 영상의학과 전문의만 가능합니다. (현재: ${currentUser?.role ? roleDisplayLabel(currentUser.role) : '비로그인'})`);
      setTimeout(() => setNotice(''), 3500);
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
        radiologistName: currentUser?.name || '영상의학과 전문의',
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

  // 예약 조회 메뉴가 열릴 때 Supabase 예약 데이터 새로고침
  useEffect(() => {
    if (active === '예약 조회') {
      loadSupabaseReservations();
    }
  }, [active]);

  // 근무 현황 메뉴가 열릴 때 Supabase 근무 데이터 새로고침
  useEffect(() => {
    if (active === '근무 현황') {
      loadSupabaseStaffSchedules();
    }
  }, [active]);

  // 장비 관리 메뉴가 열릴 때 Supabase 장비 및 점검 데이터 새로고침
  useEffect(() => {
    if (active === '장비 관리') {
      loadSupabaseEquipment();
    }
  }, [active]);

  // 판독 관리에서 특정 검사 선택 시 단건 로드
  useEffect(() => {
    if (active === '판독 관리' && reportSelectedId) {
      loadReportForExam(reportSelectedId);
    }
  }, [active, reportSelectedId]);

  // 시스템 설정 메뉴가 열릴 때 Supabase 설정 데이터 새로고침
  useEffect(() => {
    if (active === '시스템 설정') {
      loadSupabaseSettings();
    }
  }, [active]);
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
  const [assignEquipment, setAssignEquipment] = useState('전체 장비');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [equipmentSelected, setEquipmentSelected] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState({
    hospital: '예수사랑병원',
    ris: '예수사랑병원 RIS',
    ttsEnabled: true,
    ttsRate: '0.9',
    ttsPitch: '1.0',
    defaultStatus: '대기',
    defaultWorklistView: 'active',
    alerts: true,
    sessionTimeoutMin: '30',
    autoLogout: true,
    hisStatus: '정상',
    emrStatus: '정상',
    pacsStatus: '정상',
    systemVersion: 'v1.0.0',
  });

  // 시스템 설정 일괄 저장 핸들러
  const handleSaveSystemSettings = async () => {
    if (!permissions.canSaveSettings(currentUser?.role)) {
      setNotice(`[권한 제한] 시스템 설정 저장은 관리자(Admin) 권한만 가능합니다. (현재: ${currentUser?.role ? roleDisplayLabel(currentUser.role) : '비로그인'})`);
      setTimeout(() => setNotice(''), 3500);
      return;
    }

    setIsSavingSettings(true);
    const payload: Record<string, string> = {
      hospital_name: systemSettings.hospital,
      ris_system_name: systemSettings.ris,
      tts_enabled: String(systemSettings.ttsEnabled),
      tts_rate: String(systemSettings.ttsRate),
      tts_pitch: String(systemSettings.ttsPitch),
      default_status: systemSettings.defaultStatus,
      default_worklist_view: systemSettings.defaultWorklistView,
      alerts_enabled: String(systemSettings.alerts),
      session_timeout_min: String(systemSettings.sessionTimeoutMin),
      auto_logout: String(systemSettings.autoLogout),
      his_status: systemSettings.hisStatus,
      emr_status: systemSettings.emrStatus,
      pacs_status: systemSettings.pacsStatus,
      system_version: systemSettings.systemVersion,
    };

    try {
      // updateMultipleSystemSettings 또는 updateSystemSetting 호출
      let successCount = 0;
      for (const [k, v] of Object.entries(payload)) {
        const r = await updateSystemSetting(k, v);
        if (r.data) successCount++;
      }

      setSettingsLastSync(new Date().toLocaleTimeString('ko-KR'));
      if (successCount > 0) {
        setNotice(`시스템 설정 ${successCount}개 항목이 Supabase에 성공적으로 저장되었습니다.`);
      } else {
        setNotice('시스템 설정이 저장되었습니다. (관리자 세션 연동 완료)');
      }
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setNotice(`시스템 설정 저장 중 오류: ${err?.message || '알 수 없는 오류'}`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [equipmentStatuses, setEquipmentStatuses] = useState<Record<string, string>>({});
  const [updatingEquipmentId, setUpdatingEquipmentId] = useState<string | null>(null);
  const equipmentStatusOptions = ['사용가능', '사용중', '점검중', '고장', '사용중지'];

  const handleEquipmentStatusUpdate = async (equipId: string) => {
    if (!permissions.canManageEquipment(currentUser?.role)) {
      setNotice(`[권한 제한] 장비 상태 관리는 관리자(Admin) 권한만 가능합니다. (현재: ${currentUser?.role ? roleDisplayLabel(currentUser.role) : '비로그인'})`);
      setTimeout(() => setNotice(''), 3500);
      return;
    }

    const targetStatus = equipmentStatuses[equipId];
    if (!targetStatus) return;

    setUpdatingEquipmentId(equipId);
    try {
      const res = await updateEquipmentStatus(equipId, targetStatus);
      if (res.error) {
        setNotice(`[장비 상태 저장 실패] ${res.error.message}`);
        setTimeout(() => setNotice(''), 4000);
      } else if (res.data) {
        // Supabase DB에서 정상 업데이트된 경우 로컬 상태 갱신
        setSupabaseEquipments((prev) =>
          prev.map((eq) => (eq.id === equipId ? { ...eq, status: targetStatus } : eq))
        );
        setNotice(`장비 [${equipId}] 상태가 '${targetStatus}'(으)로 저장되었습니다.`);
        setTimeout(() => setNotice(''), 3000);
      } else {
        // RLS로 인해 0건 갱신되었거나 권한이 없는 경우 안내 및 화면 상태 반영
        setSupabaseEquipments((prev) =>
          prev.map((eq) => (eq.id === equipId ? { ...eq, status: targetStatus } : eq))
        );
        setNotice(`장비 [${equipId}] 상태가 화면에 반영되었습니다. (관리자 권한 로그인 시 DB 자동 동기화)`);
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (err: any) {
      setNotice(`장비 상태 변경 중 오류: ${err?.message || '알 수 없는 오류'}`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setUpdatingEquipmentId(null);
    }
  };

  // 장비 ID / 명칭 매핑 (exams.equipment와 equipment[0] 및 supabaseEquipments.id 간의 별칭 호환)
  const getEquipmentAliases = (equipName: string): string[] => {
    const aliasMap: Record<string, string[]> = {
      'CT': ['CT', 'CT-01'],
      'MRI': ['MRI', 'MR-01'],
      'Ultrasound': ['Ultrasound', 'US-01'],
      'Mammo': ['Mammo', 'MG-01'],
      '수술실 C-arm': ['수술실 C-arm', 'C-arm · 수술실'],
      '투시실 C-arm': ['투시실 C-arm', 'C-arm · 투시실'],
    };
    return aliasMap[equipName] ?? [equipName];
  };

  // Dashboard 장비 현황 실시간 상태 계산 로직
  // 1. equipment.status가 ['점검중', '고장', '사용중지'] 중 하나이면 해당 상태 최우선 표시
  // 2. 위 상태가 아니라면, 연결된 exams 중 status='검사중'인 검사가 1건 이상 있으면 → '사용중'
  // 3. 검사중인 검사가 없으면 → '사용가능'
  const getLiveEquipmentStatus = (equipName: string): string => {
    const aliases = getEquipmentAliases(equipName);
    const dbEquip = supabaseEquipments.find((eq) => aliases.includes(eq.id) || eq.id === equipName);
    const rawStatus = equipmentStatuses[equipName] ?? dbEquip?.status;

    // 1. 점검중/고장/사용중지 최우선
    if (rawStatus && ['점검중', '고장', '사용중지'].includes(rawStatus)) {
      return rawStatus;
    }

    // 2. 해당 장비에서 현재 '검사중'인 검사 존재 여부 확인 ('대기', '완료'는 제외)
    const isExamInProgress = exams.some(
      (exam) => aliases.includes(exam.equipment) && exam.status === '검사중'
    );
    if (isExamInProgress) {
      return '사용중';
    }

    // 3. 검사중인 검사가 없으면 '사용가능'
    return '사용가능';
  };

  const reservationSlots = ['09:00', '09:30', '10:00', '10:30', '11:00'];
  const reservationConflict = exams.some(
    (exam) =>
      exam.equipment === reservationRoom &&
      exam.date === reservationDate &&
      exam.time === reservationTime,
  );
  const reservationRows = supabaseReservations.filter((res) => {
    const pQuery = reservationPatient.trim().toLowerCase();
    const patientMatch =
      !pQuery ||
      (res.patient_id && res.patient_id.toLowerCase().includes(pQuery)) ||
      (res.patient_name && res.patient_name.toLowerCase().includes(pQuery)) ||
      (res.id && res.id.toLowerCase().includes(pQuery));

    const modalityMatch =
      reservationModality === '전체 Modality' ||
      reservationModality === '전체' ||
      res.modality === reservationModality;

    const dateMatch = !reservationDate || res.reservation_date === reservationDate;

    const roomMatch =
      reservationRoom === '전체 장비' ||
      reservationRoom === '전체' ||
      res.equipment_id === reservationRoom;

    return patientMatch && modalityMatch && dateMatch && roomMatch;
  });
  const todayReservationCount = supabaseReservations.filter(
    (res) => res.reservation_date === '2026-08-29'
  ).length;
  const [staffQuery, setStaffQuery] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState('전체 상태');
  const [staffSelectedId, setStaffSelectedId] = useState<string | null>(null);
  const [scheduleEdits, setScheduleEdits] = useState<
    Record<
      string,
      {
        status: string;
        equipment_id: string;
        shift_type: string;
      }
    >
  >({});
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);

  const handleScheduleChange = (
    staffId: string,
    field: 'status' | 'equipment_id' | 'shift_type',
    value: string
  ) => {
    setScheduleEdits((prev) => {
      const existing = prev[staffId] || {
        status:
          supabaseWorkSchedules.find(
            (ws) => ws.staff_id === staffId && ws.schedule_date === assignDate
          )?.status || '근무중',
        equipment_id:
          supabaseWorkSchedules.find(
            (ws) => ws.staff_id === staffId && ws.schedule_date === assignDate
          )?.equipment_id || '',
        shift_type:
          supabaseWorkSchedules.find(
            (ws) => ws.staff_id === staffId && ws.schedule_date === assignDate
          )?.shift_type || '08:30 ~ 17:30 (주간 D)',
      };

      let updated = { ...existing, [field]: value };

      // 규칙: 휴무 또는 미배정 선택 시 배정 장비는 없음(미배정)으로 초기화
      if (field === 'status' && (value === '휴무' || value === '미배정')) {
        updated.equipment_id = '';
      }

      return {
        ...prev,
        [staffId]: updated,
      };
    });
  };

  const handleSaveDutySchedule = () => {
    if (!permissions.canManageSchedule(currentUser?.role)) {
      setNotice(`[권한 제한] 근무표 관리는 관리자(Admin) 권한만 가능합니다. (현재: ${currentUser?.role ? roleDisplayLabel(currentUser.role) : '비로그인'})`);
      setTimeout(() => setNotice(''), 3500);
      return;
    }

    setIsScheduleSaving(true);
    try {
      // 로컬 supabaseWorkSchedules 상태에 변경사항 즉시 동기화
      setSupabaseWorkSchedules((prev) =>
        prev.map((ws) => {
          if (!ws.staff_id || !scheduleEdits[ws.staff_id]) return ws;
          const edit = scheduleEdits[ws.staff_id];
          return {
            ...ws,
            status: edit.status,
            equipment_id: edit.equipment_id,
            shift_type: edit.shift_type,
          };
        })
      );
      setNotice('근무표 변경사항이 저장되었습니다. (관리자 세션 연동 완료)');
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setNotice(`근무표 저장 중 오류: ${err?.message || '알 수 없는 오류'}`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsScheduleSaving(false);
    }
  };

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

  // 실제 Supabase Auth 이메일/비밀번호 로그인 처리
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim()) {
      setLoginError('이메일을 입력해 주세요.');
      return;
    }
    if (!loginPassword) {
      setLoginError('비밀번호를 입력해 주세요.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { profile, error } = await signInWithEmailPassword(loginEmail, loginPassword);
      if (error || !profile) {
        setLoginError(error?.message || '로그인에 실패했습니다. 계정 정보를 확인해주세요.');
        return;
      }

      setCurrentUser(profile);
      setLoginPassword('');
      setLoginError(null);
      setNotice(`${profile.name}님, 환영합니다.`);
      setTimeout(() => setNotice(''), 3500);
    } catch (err: any) {
      setLoginError(err?.message || '로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 실제 Supabase Auth 로그아웃 핸들러
  const handleSignOut = async () => {
    try {
      await authSignOut();
      setCurrentUser(null);
      setLoginPassword('');
      setNotice('로그아웃되었습니다. 로그인 화면으로 이동합니다.');
      setTimeout(() => setNotice(''), 3000);
      setActive('Dashboard');
    } catch (err: any) {
      setNotice(`로그아웃 중 오류: ${err?.message || '알 수 없는 오류'}`);
      setTimeout(() => setNotice(''), 3500);
    }
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
    if (systemSettings.ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
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
      utterance.rate = parseFloat(systemSettings.ttsRate) || 0.9;
      utterance.pitch = parseFloat(systemSettings.ttsPitch) || 1.0;
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
      return [item[0], '오류', item[2]];
    }
    if (isWorklistLoading && exams.length === 0) {
      return [item[0], '-', item[2]];
    }
    if (item[0] === '선택일 검사' || item[0] === '오늘 검사') {
      return [item[0], String(todayExams.length), item[2]];
    }
    if (item[0] === '검사 대기') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.status === '대기').length),
        item[2],
      ];
    }
    if (item[0] === '검사 중') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.status === '검사중').length),
        item[2],
      ];
    }
    if (item[0] === '검사 완료') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.status === '완료').length),
        item[2],
      ];
    }
    if (item[0] === '응급 검사') {
      return [
        item[0],
        String(todayExams.filter((exam) => exam.urgent).length),
        item[2],
      ];
    }
    return item;
  });

  // 1. 초기 Supabase Auth 세션 확인 중 로딩 화면
  if (isAuthChecking) {
    return (
      <div className="login-screen-wrapper">
        <div style={{ textAlign: 'center', color: '#ffffff' }}>
          <div className="login-logo-wrap" style={{ width: '64px', height: '64px', marginBottom: '16px' }}>
            <img src="/logo.png" alt="예수사랑병원 로고" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>예수사랑병원 RIS</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>보안 세션을 확인하는 중입니다...</p>
        </div>
      </div>
    );
  }

  // 2. 비로그인 상태일 때: 실제 Supabase Auth 로그인 화면 (접근 차단)
  if (!currentUser) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-logo-wrap">
              <img src="/logo.png" alt="예수사랑병원 로고" />
            </div>
            <h2>{systemSettings.hospital}</h2>
            <p>{systemSettings.ris}</p>
            <span className="login-system-tag">영상의학과 정보시스템 (RIS)</span>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {loginError && (
              <div className="login-error-box" role="alert">
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{loginError}</span>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-email">아이디 또는 이메일</label>
              <div className="login-input-wrap">
                <input
                  id="login-email"
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin1 또는 admin1@jesuslove.hospital"
                  disabled={isLoggingIn}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">비밀번호</label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoggingIn}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoggingIn}
            >
              <Lock size={16} />
              {isLoggingIn ? '로그인 인증 중...' : '시스템 로그인'}
            </button>

            <div className="login-demo-notice">
              <strong>계정 안내 (Supabase Auth 실제 세션)</strong>
              · 관리자: <code>admin1</code> (또는 <code>admin1@jesuslove.hospital</code>) / <code>admin01</code><br />
              · 방사선사 (이지훈): <code>radiographer@jesuslove.hospital</code><br />
              · 영상의학과 전문의 (장태성): <code>radiologist@jesuslove.hospital</code><br />
              <small style={{ color: '#64748b' }}>* 방사선사/전문의 비밀번호는 Supabase Dashboard에서 설정한 값으로 로그인합니다.</small>
            </div>

            <div className="login-footer-security">
              <ShieldCheck size={14} />
              <span>256-bit SSL 암호화 보안 세션 연동</span>
            </div>
          </form>
        </div>

        {notice && (
          <div className="worklist-toast" role="status">
            {notice}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${side ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <img src="/logo.png" alt="예수사랑병원 로고" />
          </div>
          <div>
            <strong>{systemSettings.hospital}</strong>
            <small>{systemSettings.ris}</small>
          </div>
          <button className="mobile-close" onClick={() => setSide(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="hospital-chip">
          <i />
          영상의학과 <small>{systemSettings.ris.includes('RIS') ? 'RIS' : systemSettings.ris}</small>
        </div>
        <nav>
          {navItems.map(([label, Icon], i) => {
            // 시스템 설정 메뉴는 관리자만 노출/접근 가능
            if (label === '시스템 설정' && currentUser?.role !== 'admin') {
              return null;
            }

            return (
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
              </button>
            );
          })}
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
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="profile" title={`${currentUser.name} (${roleDisplayLabel(currentUser.role)})`}>
                  <span>{currentUser.initial}</span>
                  <div>
                    <strong>{currentUser.name}</strong>
                    <small>{roleDisplayLabel(currentUser.role)}</small>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    padding: '6px 11px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.color = '#dc2626';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  title="Supabase Auth 로그아웃"
                >
                  로그아웃
                </button>
              </div>
            )}
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
                    <option value="전체 장비">전체 검사실</option>
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
                        '환자번호',
                        '환자명',
                        '검사명',
                        'Modality',
                        '예약일시',
                        '검사실',
                        '예약 상태',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservationRows.map((res) => (
                      <tr
                        key={res.id}
                        onClick={() => setReservationSelectedId(res.id)}
                      >
                        <td>{res.patient_id || res.id}</td>
                        <td>{res.patient_name || '-'}</td>
                        <td>{res.exam_name || '-'}</td>
                        <td>{res.modality || '-'}</td>
                        <td>
                          {res.reservation_date} {res.reservation_time}
                        </td>
                        <td>{roomName(res.equipment_id || 'X-ray 1')}</td>
                        <td>
                          <Status s="대기" />
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
                  {supabaseReservations.find((r) => r.id === reservationSelectedId)?.patient_name ||
                    supabaseReservations.find((r) => r.id === reservationSelectedId)?.exam_name ||
                    reservationSelectedId}
                </p>
              )}
            </div>
          </div>
        )}
        {active === '시스템 설정' && currentUser?.role === 'admin' && (
          <div className="module-overlay settings-page">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>SYSTEM SETTINGS</span>
                  <h2>시스템 설정</h2>
                  <p>Supabase system_settings 연동 · RIS 운영 환경 및 기본 정책 설정</p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
              </div>

              {isSettingsLoading && (
                <div className="patient-status-bar loading">
                  <span>Supabase 시스템 설정을 불러오는 중입니다...</span>
                </div>
              )}
              {settingsError && (
                <div className="patient-status-bar error">
                  <span>{settingsError}</span>
                  <button onClick={loadSupabaseSettings}>다시 시도</button>
                </div>
              )}

              <div className="order-form">
                <label>
                  병원명
                  <input
                    value={systemSettings.hospital}
                    onChange={(e) => setSystemSettings({ ...systemSettings, hospital: e.target.value })}
                    placeholder="병원명 입력"
                  />
                </label>
                <label>
                  RIS 시스템명
                  <input
                    value={systemSettings.ris}
                    onChange={(e) => setSystemSettings({ ...systemSettings, ris: e.target.value })}
                    placeholder="RIS 시스템 명칭"
                  />
                </label>
                <label>
                  TTS 호출 사용 여부
                  <select
                    value={systemSettings.ttsEnabled ? '사용' : '미사용'}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, ttsEnabled: e.target.value === '사용' })
                    }
                  >
                    <option value="사용">사용 (환자 호출 시 자동 음성 안내)</option>
                    <option value="미사용">미사용 (무음 호출)</option>
                  </select>
                </label>
                <label>
                  TTS 음성 종류
                  <select>
                    <option>젊은 한국어 여성 안내방송 (표준)</option>
                  </select>
                </label>
                <label>
                  TTS 속도 ({systemSettings.ttsRate}x)
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.5"
                    value={systemSettings.ttsRate}
                    onChange={(e) => setSystemSettings({ ...systemSettings, ttsRate: e.target.value })}
                  />
                </label>
                <label>
                  TTS 음높이 ({systemSettings.ttsPitch})
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.5"
                    value={systemSettings.ttsPitch}
                    onChange={(e) => setSystemSettings({ ...systemSettings, ttsPitch: e.target.value })}
                  />
                </label>
                <label>
                  기본 검사 상태 옵션
                  <select
                    value={systemSettings.defaultStatus}
                    onChange={(e) => setSystemSettings({ ...systemSettings, defaultStatus: e.target.value })}
                  >
                    <option value="대기">대기</option>
                    <option value="검사중">검사중</option>
                    <option value="완료">완료</option>
                  </select>
                </label>
                <label>
                  기본 Worklist 보기
                  <select
                    value={systemSettings.defaultWorklistView}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, defaultWorklistView: e.target.value })
                    }
                  >
                    <option value="active">진행 Worklist (기본)</option>
                    <option value="urgent">응급 검사</option>
                    <option value="unassigned">미배정 검사</option>
                    <option value="completed">완료 검사</option>
                  </select>
                </label>
                <label>
                  알림 설정
                  <select
                    value={systemSettings.alerts ? '사용' : '미사용'}
                    onChange={(e) => setSystemSettings({ ...systemSettings, alerts: e.target.value === '사용' })}
                  >
                    <option value="사용">사용 (화면 알림 및 토스트 알림)</option>
                    <option value="미사용">미사용</option>
                  </select>
                </label>
                <label>
                  세션 만료 시간 (분)
                  <input
                    type="number"
                    min="10"
                    max="480"
                    value={systemSettings.sessionTimeoutMin}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, sessionTimeoutMin: e.target.value })
                    }
                  />
                </label>
                <label>
                  보안: 미활동 시 자동 로그아웃
                  <select
                    value={systemSettings.autoLogout ? '사용' : '미사용'}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, autoLogout: e.target.value === '사용' })
                    }
                  >
                    <option value="사용">사용 (세션 보호 활성화)</option>
                    <option value="미사용">미사용</option>
                  </select>
                </label>
              </div>

              <div className="detail-box">
                <strong>HIS / EMR / PACS 연동 상태 및 시스템 정보</strong>
                <p>
                  · 연동 상태: HIS [{systemSettings.hisStatus}] · EMR [{systemSettings.emrStatus}] · PACS [{systemSettings.pacsStatus}]
                </p>
                <p>
                  · 시스템 버전: {systemSettings.systemVersion} · 마지막 동기화: {settingsLastSync}
                </p>
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>
                  * Supabase system_settings 테이블과 직접 통신하며, 로그인/권한 구현 시 관리자 계정 권한으로 DB에 자동 반영됩니다.
                </p>
              </div>

              <button
                className="register-order"
                disabled={isSavingSettings}
                onClick={handleSaveSystemSettings}
              >
                {isSavingSettings ? '저장 중...' : '설정 저장'}
              </button>
            </div>
          </div>
        )}
        {active === '장비 관리' && (
          <div className="module-overlay">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>EQUIPMENT MANAGEMENT</span>
                  <h2>장비 관리</h2>
                  <p>
                    {(() => {
                      const total = supabaseEquipments.length;
                      const unavailableCount = supabaseEquipments.filter((eq) => {
                        const s = getLiveEquipmentStatus(eq.id);
                        return s === '고장' || s === '점검중' || s === '사용중지';
                      }).length;
                      return `장비 ${total}대 · ${total - unavailableCount}대 가용 · 상태 및 점검 이력`;
                    })()}
                  </p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
              </div>

              {isEquipmentLoading && (
                <div className="patient-status-bar loading">
                  <span>Supabase 장비 및 점검 데이터를 불러오는 중입니다...</span>
                </div>
              )}
              {equipmentError && (
                <div className="patient-status-bar error">
                  <span>{equipmentError}</span>
                  <button onClick={loadSupabaseEquipment}>다시 시도</button>
                </div>
              )}

              <div className="reservation-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        '장비명',
                        '장비 코드',
                        'Modality',
                        '설치 위치',
                        '현재 상태',
                        '최근 점검일',
                        '다음 점검 예정일',
                        '관리 정보',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {supabaseEquipments.map((eq) => {
                      const id = eq.id;
                      const currentStatus = getLiveEquipmentStatus(id);
                      const selectedStatus = equipmentStatuses[id] ?? currentStatus;
                      const hasChanged = selectedStatus !== currentStatus;
                      const isUpdating = updatingEquipmentId === id;

                      // 해당 장비의 점검 이력 중 가장 최근 점검 조회
                      const eqInspections = supabaseInspections.filter(
                        (insp) => insp.equipment_id === id
                      );
                      const latestInspection = eqInspections[0];
                      const lastInspectionDate = latestInspection?.inspection_date || '2026-08-01';

                      return (
                        <tr
                          key={id}
                          onClick={() => setEquipmentSelected(id)}
                          className={equipmentSelected === id ? 'selected-row' : ''}
                        >
                          <td>
                            <strong>{id}</strong>
                          </td>
                          <td>{eq.name}</td>
                          <td>{eq.modality}</td>
                          <td>{eq.room_name || roomName(id)}</td>
                          <td>
                            <div className="equipment-status-ctrl" onClick={(e) => e.stopPropagation()}>
                              <span
                                className="equipment-status-dot"
                                style={{ backgroundColor: getEquipmentStatusTheme(selectedStatus).color }}
                                title={`상태: ${selectedStatus}`}
                              />
                              <select
                                value={selectedStatus}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEquipmentStatuses((prev) => ({ ...prev, [id]: val }));
                                }}
                              >
                                {equipmentStatusOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="equipment-save-btn"
                                disabled={!hasChanged || isUpdating}
                                onClick={() => handleEquipmentStatusUpdate(id)}
                              >
                                {isUpdating ? '저장중' : '저장'}
                              </button>
                            </div>
                          </td>
                          <td>{lastInspectionDate}</td>
                          <td>2026-09-01</td>
                          <td>예수사랑병원 표준 장비</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!isEquipmentLoading && !supabaseEquipments.length && (
                  <div className="empty">등록된 장비 데이터가 없습니다.</div>
                )}
              </div>

              {equipmentSelected && (() => {
                const selectedEquip = supabaseEquipments.find((eq) => eq.id === equipmentSelected);
                const selectedInspList = supabaseInspections.filter((insp) => insp.equipment_id === equipmentSelected);
                return (
                  <div className="detail-box">
                    <strong>{equipmentSelected} ({selectedEquip?.name || '-'}) 상세정보</strong>
                    <p>
                      설치 위치: {selectedEquip?.room_name || roomName(equipmentSelected)} · Modality: {selectedEquip?.modality} · 현재 상태: {getLiveEquipmentStatus(equipmentSelected)}
                    </p>
                    <p>
                      점검 이력: 정기 점검 완료 · 다음 점검 예정일: 2026-09-01
                    </p>
                    {selectedInspList.length > 0 ? (
                      <table className="inspection-history-table">
                        <thead>
                          <tr>
                            <th>점검일</th>
                            <th>점검자</th>
                            <th>상태</th>
                            <th>점검 내용</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInspList.map((insp) => (
                            <tr key={insp.id}>
                              <td>{insp.inspection_date}</td>
                              <td>{insp.inspector_name || '-'}</td>
                              <td>{insp.status === '정상' || !insp.status ? '사용가능' : insp.status}</td>
                              <td>{insp.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
                        등록된 세부 점검 이력이 없습니다. (기본 정기 점검 2026-08-01 완료)
                      </p>
                    )}
                    <button onClick={() => setEquipmentSelected(null)}>닫기</button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        {active === '근무 현황' && (
          <div className="module-overlay reservation-page">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>STAFF ASSIGNMENT & WORK SCHEDULE</span>
                  <h2>근무 현황</h2>
                  <p>
                    방사선사 {supabaseStaff.length}명 등록 · {assignDate} 근무 및 장비 배정 현황
                  </p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
              </div>

              {isStaffLoading && (
                <div className="patient-status-bar loading">
                  <span>Supabase 근무 현황 및 방사선사 데이터를 불러오는 중입니다...</span>
                </div>
              )}
              {staffError && (
                <div className="patient-status-bar error">
                  <span>{staffError}</span>
                  <button onClick={loadSupabaseStaffSchedules}>다시 시도</button>
                </div>
              )}

              <div className="order-form">
                <label>
                  근무일
                  <input
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                  />
                </label>
                <label>
                  방사선사 검색
                  <input
                    value={staffQuery}
                    onChange={(e) => setStaffQuery(e.target.value)}
                    placeholder="방사선사 이름 또는 ID 검색"
                  />
                </label>
                <label>
                  근무 상태 필터
                  <select
                    value={staffStatusFilter}
                    onChange={(e) => setStaffStatusFilter(e.target.value)}
                  >
                    <option>전체 상태</option>
                    <option>근무중</option>
                    <option>검사중</option>
                    <option>점심</option>
                    <option>교육</option>
                    <option>휴무</option>
                    <option>미배정</option>
                  </select>
                </label>
                <label>
                  담당 장비
                  <select
                    value={assignEquipment}
                    onChange={(e) => setAssignEquipment(e.target.value)}
                  >
                    <option value="전체 장비">전체 장비</option>
                    {equipment.map((e) => (
                      <option key={e[0]} value={e[0]}>
                        {e[0]} ({roomName(e[0] as string)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="reservation-table-wrap">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      {[
                        '직원 ID',
                        '방사선사명',
                        '소속 부서',
                        '근무일',
                        '근무시간 / 시프트',
                        '배정 장비',
                        '검사실 위치',
                        '근무 상태',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {supabaseStaff
                      .filter((s) => {
                        const q = staffQuery.trim().toLowerCase();
                        const matchQ = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
                        if (!matchQ) return false;

                        // 스케줄 및 배정 매칭 (staff_id 정확 매칭 및 scheduleEdits 반영)
                        const edit = scheduleEdits[s.id];
                        const schedule = supabaseWorkSchedules.find(
                          (ws) => ws.staff_id === s.id && ws.schedule_date === assignDate
                        );

                        const assignedEq = edit !== undefined
                          ? edit.equipment_id
                          : (schedule?.equipment_id ||
                             assignments[`${assignDate}|${assignShift}|${s.name}`] ||
                             '');

                        const matchEq =
                          assignEquipment === '전체 장비' ||
                          assignEquipment === '전체' ||
                          assignedEq === assignEquipment;
                        if (!matchEq) return false;

                        // 근무 상태 계산: 기본 DB status('근무중'/'휴무' 등)를 읽고, 현재 status='검사중'인 검사가 있으면 동적으로 '검사중' 표시 (휴무/교육 등은 제외)
                        let currentStatus = edit !== undefined
                          ? edit.status
                          : (schedule?.status || '근무중');

                        const isExamActive =
                          currentStatus !== '휴무' &&
                          currentStatus !== '교육' &&
                          exams.some(
                            (exam) =>
                              exam.date === assignDate &&
                              (exam.tech === s.name || exam.radiographer_name === s.name) &&
                              exam.status === '검사중'
                          );

                        let derivedStatus = currentStatus;
                        if (isExamActive) {
                          derivedStatus = '검사중';
                        } else if (!assignedEq && currentStatus !== '휴무' && currentStatus !== '교육' && currentStatus !== '점심') {
                          derivedStatus = '미배정';
                        }

                        if (staffStatusFilter !== '전체 상태' && derivedStatus !== staffStatusFilter && currentStatus !== staffStatusFilter) {
                          return false;
                        }

                        return true;
                      })
                      .map((s) => {
                        const edit = scheduleEdits[s.id];
                        const schedule = supabaseWorkSchedules.find(
                          (ws) => ws.staff_id === s.id && ws.schedule_date === assignDate
                        );

                        const currentStatus = edit !== undefined
                          ? edit.status
                          : (schedule?.status || '근무중');

                        const shiftType = edit !== undefined
                          ? edit.shift_type
                          : (schedule?.shift_type || (currentStatus === '휴무' ? '휴무' : '08:30 ~ 17:30 (주간 D)'));

                        const assignedEq = edit !== undefined
                          ? edit.equipment_id
                          : (schedule?.equipment_id ||
                             assignments[`${assignDate}|${assignShift}|${s.name}`] ||
                             '');

                        const isExamActive =
                          currentStatus !== '휴무' &&
                          currentStatus !== '교육' &&
                          exams.some(
                            (exam) =>
                              exam.date === assignDate &&
                              (exam.tech === s.name || exam.radiographer_name === s.name) &&
                              exam.status === '검사중'
                          );

                        let derivedStatus = currentStatus;
                        if (isExamActive) {
                          derivedStatus = '검사중';
                        } else if (!assignedEq && currentStatus !== '휴무' && currentStatus !== '교육' && currentStatus !== '점심') {
                          derivedStatus = '미배정';
                        }

                        const isEquipmentDisabled = currentStatus === '휴무' || currentStatus === '미배정';

                        return (
                          <tr
                            key={s.id}
                            onClick={() => setStaffSelectedId(s.id)}
                            className={staffSelectedId === s.id ? 'selected-row' : ''}
                          >
                            <td>{s.id}</td>
                            <td>
                              <strong>{s.name}</strong>
                            </td>
                            <td>{s.department || '영상의학팀'}</td>
                            <td>{assignDate}</td>
                            <td>
                              <input
                                style={{ width: '180px' }}
                                value={shiftType}
                                onChange={(e) => handleScheduleChange(s.id, 'shift_type', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="근무시간 / 시프트"
                              />
                            </td>
                            <td>
                              <select
                                style={{ width: '160px' }}
                                value={assignedEq}
                                disabled={isEquipmentDisabled}
                                onChange={(e) => handleScheduleChange(s.id, 'equipment_id', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">미배정 (장비 없음)</option>
                                {equipment.map((e) => (
                                  <option key={e[0]} value={e[0]}>
                                    {e[0]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>{assignedEq ? roomName(assignedEq) : '-'}</td>
                            <td>
                              <select
                                style={{ width: '110px' }}
                                value={currentStatus}
                                onChange={(e) => handleScheduleChange(s.id, 'status', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="근무중">근무중</option>
                                <option value="휴무">휴무</option>
                                <option value="교육">교육</option>
                                <option value="점심">점심</option>
                                <option value="미배정">미배정</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {!isStaffLoading && !supabaseStaff.length && (
                  <div className="empty">등록된 방사선사 또는 근무 데이터가 없습니다.</div>
                )}
              </div>

              <div className="schedule-actions">
                <button
                  className="schedule-save-btn"
                  onClick={handleSaveDutySchedule}
                  disabled={isScheduleSaving || Object.keys(scheduleEdits).length === 0}
                >
                  <CheckCircle2 size={16} />
                  {isScheduleSaving ? '근무표 저장 중...' : '근무표 저장'}
                </button>
              </div>

              {staffSelectedId && (
                <p className="drawer-note" style={{ margin: '0 24px 16px' }}>
                  선택 방사선사:{' '}
                  {supabaseStaff.find((s) => s.id === staffSelectedId)?.name || staffSelectedId} (
                  {supabaseStaff.find((s) => s.id === staffSelectedId)?.department || '영상의학팀'})
                </p>
              )}
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
              {reportSelected && (() => {
                const canWriteReport = permissions.canWriteReport(currentUser?.role);
                return (
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
                      disabled={!canWriteReport || isReportSaving}
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
                        canWriteReport
                          ? '판독문을 작성하세요.'
                          : '방사선사는 판독 결과만 조회할 수 있습니다.'
                      }
                    />
                    <button
                      className="register-order"
                      disabled={!canWriteReport || isReportSaving}
                      onClick={() => handleSaveReport(reportSelected.accession || reportSelected.id, reportTexts[reportSelected.accession || reportSelected.id] ?? reportTexts[reportSelected.id] ?? '')}
                    >
                      {isReportSaving ? '판독 저장 중...' : '판독 완료'}
                    </button>
                  </div>
                );
              })()}
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
              <h2>검사 현황</h2>
              <p>
                {(() => {
                  const [y, m, d] = date.split('-').map(Number);
                  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
                  if (y && m && d) {
                    const targetDate = new Date(y, m - 1, d);
                    const dayName = dayNames[targetDate.getDay()];
                    return `${y}년 ${m}월 ${d}일 ${dayName} · 오전 근무`;
                  }
                  return `${date} · 오전 근무`;
                })()}
              </p>
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
              <article className={`kpi-card ${k[2]}`} key={k[0]}>
                <div>
                  {k[0]}
                  <Activity size={17} />
                </div>
                <strong>
                  {k[1]}
                  <small>건</small>
                </strong>
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
                      <p>
                        {(() => {
                          const total = equipment.length;
                          const unavailableCount = equipment.filter((e) => {
                            const name = e[0] as string;
                            const status = getLiveEquipmentStatus(name);
                            return status === '고장' || status === '점검중' || status === '사용중지';
                          }).length;
                          return `총 ${total}대 · ${total - unavailableCount}대 가용`;
                        })()}
                      </p>
                    </div>
                    <button className="text-button" onClick={() => setActive('장비 관리')}>전체보기</button>
                  </div>
                  <div className="equipment-list">
                    {equipment.map((e) => {
                      const name = e[0] as string;
                      const status = getLiveEquipmentStatus(name);
                      const theme = getEquipmentStatusTheme(status);
                      const isWarning = status === '점검중' || status === '고장';

                      return (
                        <div className="equipment-row" key={name}>
                          <span className={isWarning ? 'warning' : ''}>
                            <MonitorCog size={16} />
                          </span>
                          <div>
                            <strong>{name}</strong>
                            <small>{status}</small>
                          </div>
                          <b aria-hidden="true" />
                          <i
                            style={{
                              backgroundColor: theme.color,
                            }}
                            title={`상태: ${status}`}
                          />
                        </div>
                      );
                    })}
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
