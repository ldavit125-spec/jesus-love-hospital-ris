'use client';
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDot,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  ListFilter,
  Menu,
  MonitorCog,
  MoreHorizontal,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  ['Dashboard', LayoutDashboard],
  ['환자 조회', Search],
  ['검사 오더', ClipboardList],
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
const kpis = [
  ['오늘 검사', '128', '전일 대비 +12', 'blue'],
  ['검사 대기', '24', '평균 대기 18분', 'amber'],
  ['검사 중', '8', '장비 7대 가동 중', 'cyan'],
  ['검사 완료', '91', '완료율 71.1%', 'green'],
  ['응급 검사', '5', '즉시 확인 필요', 'red'],
];
const worklist = [
  [
    '202608-01482',
    '김민준',
    'Chest PA',
    'X-ray 1',
    '호흡기내과',
    '이지훈',
    '검사 중',
  ],
  [
    '202608-01479',
    '이서연',
    'Brain CT (CE)',
    'CT-01',
    '신경외과',
    '최유진',
    '검사 대기',
  ],
  [
    '202608-01471',
    '박지우',
    'L-spine MRI',
    'MRI-01',
    '정형외과',
    '한성민',
    '접수 완료',
  ],
  [
    '202608-01466',
    '최은지',
    'Abdomen US',
    'US-01',
    '소화기내과',
    '정다은',
    '검사 중',
  ],
  [
    '202608-01458',
    '정현우',
    'Knee AP/LAT',
    'X-ray 2',
    '정형외과',
    '오세훈',
    '검사 완료',
  ],
  [
    '202608-01453',
    '유지아',
    'Mammography',
    'MG-01',
    '유방외과',
    '송지은',
    '검사 대기',
  ],
  [
    '202608-01449',
    '임도현',
    'C-spine AP/LAT',
    'X-ray 1',
    '신경외과',
    '이지훈',
    '검사 완료',
  ],
  [
    '202608-01437',
    '서하준',
    '건강검진 Chest PA',
    '건강검진 X-ray',
    '건강검진센터',
    '박소연',
    '검사 대기',
  ],
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
const staff = [
  ['이지훈', 'DR-01', '일반촬영'],
  ['오세훈', 'DR-02', '일반촬영'],
  ['최유진', 'CT-01', 'CT'],
  ['한성민', 'MRI-01', 'MRI'],
  ['정다은', 'US-01', '초음파'],
  ['송지은', 'MG-01', '유방촬영'],
];
function Status({ s }: { s: string }) {
  const t = s.includes('완료')
    ? 'complete'
    : s.includes('중')
      ? 'progress'
      : s.includes('대기')
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
    [room, setRoom] = useState('전체 장비/검사실');
  const rows = worklist.filter(
    (r) =>
      r.some((c) => c.toLowerCase().includes(query.toLowerCase())) &&
      (room === '전체 장비/검사실' || r[3] === room),
  );
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
                <p>{k[2]}</p>
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
                  <p>예약 및 접수된 오늘의 검사 목록입니다.</p>
                </div>
                <button className="more-button">
                  <MoreHorizontal size={19} />
                </button>
              </div>
              <div className="table-toolbar">
                <div className="tabs">
                  <button className="selected">
                    전체 <span>128</span>
                  </button>
                  <button>
                    응급 <span>5</span>
                  </button>
                  <button>
                    미배정 <span>6</span>
                  </button>
                </div>
                <div className="table-actions">
                  <label>
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Worklist 검색"
                    />
                  </label>
                  <div className="room-filter">
                    <ListFilter size={14} />
                    <select aria-label="장비 및 검사실 필터" value={room} onChange={(e) => setRoom(e.target.value)}>
                      <option>전체 장비/검사실</option>
                      <option>X-ray 1</option>
                      <option>X-ray 2</option>
                      <option>건강검진 X-ray</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        '환자번호',
                        '환자명',
                        '검사명',
                        '장비',
                        '진료과',
                        '담당 방사선사',
                        '검사 상태',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r[0]}>
                        {r.slice(0, 6).map((c, i) => (
                          <td key={i}>
                            {i === 0 ? (
                              <button className="patient-id">{c}</button>
                            ) : (
                              c
                            )}
                          </td>
                        ))}
                        <td>
                          <Status s={r[6]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <div className="empty">검색 결과가 없습니다.</div>
                )}
              </div>
              <div className="table-footer">
                <span>총 128건 중 1–8건</span>
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
                      <b>{e[1]}</b>
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
    </main>
  );
}
