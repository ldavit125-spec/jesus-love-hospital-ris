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
import { useState } from 'react';

const navItems = [
  ['Dashboard', LayoutDashboard],
  ['환자 조회', Search],
  ['검사 예약', CalendarDays],
  ['X-ray', Radio],
  ['CT', CircleDot],
  ['MRI', Activity],
  ['Ultrasound', HeartPulse],
  ['Mammo', ShieldCheck],
  ['C-arm', Stethoscope],
  ['Portable', Zap],
  ['판독 관리', ClipboardList],
  ['방사선사 배정', UsersRound],
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
  ['MRI', 'MRI-01'],
  ['Ultrasound', 'US-01'],
  ['Mammo', 'MG-01'],
  ['수술실 C-arm', 'C-arm · 수술실'],
  ['투시실 C-arm', 'C-arm · 투시실'],
  ['Portable X-ray', 'Portable X-ray'],
] as const;
const kpis = [
  ['오늘 검사', '128', '전일 대비 +12', 'blue'],
  ['검사 대기', '24', '평균 대기 18분', 'amber'],
  ['검사 중', '8', '장비 7대 가동 중', 'cyan'],
  ['검사 완료', '91', '', 'green'],
  ['응급 검사', '5', '즉시 확인 필요', 'red'],
];
type Exam = {
  id: string;
  date: string;
  time: string;
  name: string;
  sex: string;
  age: number;
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
};
const initialWorklist: Exam[] = [
  {
    id: '202608-01482',
    date: '2026-08-29',
    time: '08:35',
    name: '김민준',
    sex: '남',
    age: 64,
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
    exam: 'L-spine MRI',
    modality: 'MRI',
    equipment: 'MRI-01',
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
    'MRI-01': 'MRI실',
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
  ['한성민', 'MRI-01', 'MRI'],
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
    s === '완료'
      ? 'complete'
      : s === '검사중'
        ? 'progress'
        : s === '대기'
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
    [exams, setExams] = useState(initialWorklist),
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
  const [reservationPatient, setReservationPatient] = useState('');
  const [reservationExam, setReservationExam] = useState('');
  const [reservationRoom, setReservationRoom] = useState('X-ray 1');
  const [reservationDate, setReservationDate] = useState('2026-08-29');
  const [reservationTime, setReservationTime] = useState('09:00');
  const selected = exams.find((exam) => exam.id === selectedId) ?? null;
  const reservationSlots = ['09:00', '09:30', '10:00', '10:30', '11:00'];
  const reservationConflict = exams.some(
    (exam) =>
      exam.equipment === reservationRoom &&
      exam.date === reservationDate &&
      exam.time === reservationTime,
  );
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
        const audioContext = new AudioContext();
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
      const utterance = new SpeechSynthesisUtterance(
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
  const findPatient = () => {
    const value = patientQuery.trim().toLowerCase();
    setPatientResult(
      exams.find(
        (exam) =>
          exam.id.toLowerCase().includes(value) ||
          exam.name.toLowerCase().includes(value),
      ) ?? null,
    );
  };
  return (
    <main className="app-shell">
      <aside className={`sidebar ${side ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">+</div>
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
              {i === 2 && <em>6</em>}
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
            <div className="system-state">
              <i />
              시스템 정상
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
              <ChevronDown size={14} />
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
                  <p>환자번호, 이름 또는 생년월일로 환자를 조회합니다.</p>
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
                  placeholder="환자번호 / 이름 / 생년월일 (YYYY-MM-DD)"
                />
                <button onClick={findPatient}>조회</button>
              </div>
              {patientResult ? (
                <div className="patient-detail">
                  <div className="patient-banner">
                    <div className="patient-avatar large">
                      {patientResult.name[0]}
                    </div>
                    <div>
                      <h3>
                        {patientResult.name}{' '}
                        <small>
                          {patientResult.sex} · {patientResult.age}세
                        </small>
                      </h3>
                      <p>
                        {patientResult.id} · {patientResult.date} 등록
                      </p>
                    </div>
                  </div>
                  <div className="patient-info-grid">
                    <div>
                      <span>환자번호</span>
                      <strong>{patientResult.id}</strong>
                    </div>
                    <div>
                      <span>생년월일</span>
                      <strong>19{patientResult.id.slice(-2)}-04-12</strong>
                    </div>
                    <div>
                      <span>진료과</span>
                      <strong>{patientResult.department}</strong>
                    </div>
                    <div>
                      <span>주치의</span>
                      <strong>{patientResult.doctor}</strong>
                    </div>
                  </div>
                  <div className="history-section">
                    <h4>오늘 검사 오더</h4>
                    {exams
                      .filter(
                        (exam) =>
                          exam.id === patientResult.id ||
                          exam.name === patientResult.name,
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
        {active === '검사 예약' && (
          <div className="module-overlay">
            <div className="module-card order-card">
              <div className="module-head">
                <div>
                  <span>HIS / EMR PRESCRIPTIONS</span>
                  <h2>검사 예약</h2>
                  <p>HIS/EMR에서 발행된 처방을 선택해 예약합니다.</p>
                </div>
                <button onClick={() => setActive('Dashboard')}>
                  <X size={18} />
                </button>
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
                  검사명
                  <input
                    value={reservationExam}
                    onChange={(e) => setReservationExam(e.target.value)}
                    placeholder="검사명을 입력하세요"
                  />
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
                <label>
                  예약시간
                  <input
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    placeholder="예: 09:30"
                  />
                </label>
              </div>
              {reservationConflict && (
                <p className="form-error">
                  동일 검사실에 이미 예약된 시간입니다.
                </p>
              )}
              <button
                className="register-order"
                disabled={
                  !reservationPatient || !reservationExam || reservationConflict
                }
                onClick={registerReservation}
              >
                예약 완료 · Worklist 연동
              </button>
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
        <div className="content">
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
          <section className="kpi-grid">
            {kpis.map((k) => (
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
          <div className="dashboard-grid">
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
                        exams.filter((exam) =>
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
                        exams.filter(
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
                        exams.filter(
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
                      {exams.filter((exam) => exam.status === '완료').length}
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
                            {exam.sex}/{exam.age}
                          </small>
                        </td>
                        <td>{exam.exam}</td>
                        <td>{exam.modality}</td>
                        <td>{roomName(exam.equipment)}</td>
                        <td>
                          {exam.tech || (
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
                <span>검색 결과 {rows.length}건 · 전체 128건</span>
                <div>
                  <button disabled>이전</button>
                  <button className="current">1</button>
                  <button>2</button>
                  <button>3</button>
                  <button>다음</button>
                </div>
              </div>
            </section>
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
                        <small>{e[2]}</small>
                      </div>
                      <b aria-hidden="true" />
                      <i className={!e[3] ? 'warn' : ''} />
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-header compact">
                  <div>
                    <h3>오늘의 방사선사 배치</h3>
                    <p>근무자 8명 · 현재 7명</p>
                  </div>
                  <button className="text-button">배정관리</button>
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
            </aside>
          </div>
        </div>
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
                    {selected.sex}/{selected.age}세
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
                disabled={selected.status !== '대기'}
                onClick={() => updateExam(selected.id, { status: '검사중' })}
              >
                <Play size={14} />
                검사 시작
              </button>
              <button
                className="action-complete"
                disabled={selected.status !== '검사중'}
                onClick={() => updateExam(selected.id, { status: '완료' })}
              >
                <CheckCircle2 size={14} />
                검사 완료
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
