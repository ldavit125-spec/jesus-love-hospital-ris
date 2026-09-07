# 🏥 예수사랑병원 RIS
### Jesus Love Hospital Radiology Information System

영상의학과의 검사 업무 흐름을 웹 기반으로 구현한  
**RIS(Radiology Information System) 포트폴리오 프로젝트**입니다.

환자 조회, 검사 Worklist, 검사 안전 체크리스트, 판독 관리,
근무 현황, 장비 관리, 사용자 인증 및 역할별 권한 제어까지
영상의학과의 주요 업무 흐름을 하나의 시스템으로 구성했습니다.

> ⚠️ 본 프로젝트는 취업 포트폴리오 및 학습 목적으로 제작된 가상 시스템입니다.  
> 실제 의료기관에서 사용되는 상용 의료정보시스템이 아니며,
> 프로젝트 내 환자 및 직원 정보는 모두 가상 데이터입니다.

---

## 📌 Project Overview

**프로젝트명**

예수사랑병원 RIS

**개발 목적**

방사선사의 실제 영상의학과 업무 흐름을 바탕으로
의료정보시스템의 구조를 이해하고,
웹 기반 RIS 프로토타입을 구현하는 것을 목표로 제작했습니다.

특히 단순한 화면 구현에 그치지 않고 다음과 같은 부분을 중점적으로 구현했습니다.

- 검사 상태 Workflow
- 영상장비별 Worklist
- 검사 전 환자 안전 체크리스트
- 판독 Workflow
- 사용자 인증
- 역할 기반 접근 제어(RBAC)
- Supabase Row Level Security(RLS)
- 데이터베이스 기반 장비 및 근무 현황 관리

---

# ✨ Main Features

## 1. Dashboard

영상의학과의 당일 검사 현황을 한눈에 확인할 수 있습니다.

- 전체 검사 건수
- 대기 검사
- 검사중 검사
- 완료 검사
- 응급 검사
- 장비별 실시간 사용 상태
- 날짜별 검사 현황 조회

장비 상태는 단순히 DB의 상태값만 표시하지 않고,
현재 `검사중`인 검사 여부를 함께 반영하여 계산합니다.

예:

```text
장비 자체 이상 없음 + 검사중 환자 있음
→ 사용중

장비 자체 이상 없음 + 검사중 환자 없음
→ 사용가능

장비 DB 상태 = 점검중 / 고장 / 사용중지
→ 해당 상태 우선 표시
```

## 2. 환자 조회

환자의 기본 정보 및 검사 이력을 조회할 수 있습니다.

환자번호
환자명
성별
생년월일
나이
연락처
검사 이력

환자의 나이는 저장된 생년월일을 기준으로 계산됩니다.

## 3. 검사 Worklist

영상의학과에서 수행해야 할 검사 목록을 관리합니다.

검사 상태는 다음 Workflow를 따릅니다.

대기
 ↓
검사중
 ↓
완료

완료된 검사는 다시 이전 상태로 되돌릴 수 없도록
역방향 상태 변경을 차단했습니다.

검사 완료 시 자동으로:

interpretation_status = 판독대기

상태가 지정되어 영상의학과 전문의의 판독 Workflow로 연결됩니다.

## 4. 검사 안전 체크리스트

검사 종류별 환자 안전 확인 절차를 구현했습니다.

CT
조영제 사용 여부
조영제 알레르기
신장기능
금식 여부
IV 확보 여부
임신 가능성
이동 보조 필요 여부
MRI
임신 가능성
심박동기 및 체내 전자기기
인공관절 및 금속 임플란트
수술용 Clip / Coil / Stent
체내 금속성 고정물
금속성 이물질
제거 필요 금속 물품
폐쇄공포증
Ultrasound

검사 프로토콜에 따라:

금식 확인
방광 충만 확인
OR C-arm
수술 전 금식 상태
의료진 확인
임상적 사유 확인

필수 안전 항목이 확인되지 않은 경우 검사 시작을 차단하는
Fail-Closed 방식을 적용했습니다.

## 5. 판독 관리

검사가 완료되면 영상의학과 전문의가 판독을 작성할 수 있습니다.

검사 완료
 ↓
판독대기
 ↓
판독중
 ↓
판독완료

역할에 따라 기능이 구분됩니다.

방사선사
판독 결과 조회 가능
판독 작성 불가
영상의학과 전문의
판독문 작성
판독 완료
판독 상태 변경

판독 완료 시 전용 Supabase RPC를 사용하여
검사 테이블의 interpretation_status를 안전하게 변경하도록 구성했습니다.

전문의에게 exams 테이블 전체 수정 권한을 주지 않고,
판독 상태에 필요한 필드만 변경할 수 있도록 제한했습니다.

## 6. 근무 현황

영상의학과 직원의 근무 상태와 담당 장비를 확인할 수 있습니다.

근무중
휴무
교육
점심
미배정
담당 장비
근무 시간

현재 검사를 수행 중인 경우
검사 데이터를 기반으로 동적으로 검사중 상태를 표시합니다.

## 7. 장비 관리

총 10대의 영상의학 장비를 기준으로 구성했습니다.

X-ray 1
X-ray 2
건강검진 X-ray
CT-01
MR-01
US-01
MG-01
수술실 C-arm
투시실 C-arm
Portable X-ray

장비 상태:

사용가능
사용중
점검예정
점검중
고장
사용중지

장비 상태 수정은 관리자 권한에서만 가능합니다.

## 8. 시스템 설정

관리자 전용 메뉴입니다.

설정 항목:

병원명
RIS 시스템명
TTS 설정
기본 Worklist 설정
알림 설정
세션 설정
HIS 상태
EMR 상태
PACS 상태
시스템 버전
🔐 Authentication & Authorization

Supabase Auth를 사용하여 실제 로그인 세션을 구현했습니다.

사용자 정보는 Supabase Auth와
profiles 테이블을 연결하여 관리합니다.

Role
Role	설명
rt	방사선사
radiologist	영상의학과 전문의
admin	시스템 관리자
RT
검사 조회
검사 시작
검사 완료
판독 결과 조회
시스템 설정 접근 불가
판독 작성 불가
Radiologist
검사 조회
판독 관리
판독문 작성
판독 완료
검사 시작/완료 불가
장비 관리 불가
시스템 설정 접근 불가
Admin
전체 시스템 조회
장비 관리
근무 관리
시스템 설정 관리

유효하지 않은 Role이나
profiles가 존재하지 않는 사용자는
관리자 권한으로 자동 승격되지 않도록
Fail-Closed 방식을 적용했습니다.

🛡️ Database Security

Supabase Row Level Security(RLS)를 적용하여
프론트엔드 UI뿐만 아니라 데이터베이스 단계에서도
사용자 권한을 제한했습니다.

Reports
RT
→ SELECT

Radiologist
→ SELECT / INSERT / UPDATE

Admin
→ SELECT / INSERT / UPDATE

DELETE 정책은 별도로 허용하지 않았습니다.

또한 판독 완료 시 검사 상태 변경은
전용 RPC를 통해 제한적으로 처리합니다.

set_exam_interpretation_status()

이를 통해 전문의에게
exams 테이블 전체 UPDATE 권한을 주지 않고
판독 상태만 변경할 수 있도록 구성했습니다.

🧰 Tech Stack
Frontend
React 19
TypeScript
Vinext
Vite
Lucide React
Backend / Database
Supabase
PostgreSQL
Authentication
Supabase Auth
Authorization
RBAC
Supabase RLS
Deployment
Vercel
Version Control
Git
GitHub
🗂️ Database Structure

주요 테이블 구조입니다.

patients
   │
   └── exams
        │
        ├── exam_checklists
        │
        └── reports


staff
   │
   └── work_schedules


equipment
   │
   └── equipment_inspections


reservations

profiles

system_settings
🔄 RIS Workflow

전체 업무 흐름은 다음과 같습니다.

HIS / EMR 검사 처방
        ↓
RIS 검사 Worklist
        ↓
환자 확인
        ↓
검사 안전 체크
        ↓
검사 시작
        ↓
검사중
        ↓
검사 완료
        ↓
판독대기
        ↓
영상의학과 전문의 판독
        ↓
판독완료
🖥️ Local Installation
1. Repository Clone
git clone https://github.com/ldavit125-spec/jesus-love-hospital-ris.git
cd jesus-love-hospital-ris
2. Install
npm install

Windows PowerShell 환경에서 npm.ps1 실행이 차단되는 경우:

npm.cmd install
3. Environment Variables

프로젝트 루트에:

.env.local

파일을 생성합니다.

NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

⚠️ service_role 또는 secret key는
프론트엔드 환경 변수로 사용하면 안 됩니다.

4. Development Server
npm run dev

Windows PowerShell:

npm.cmd run dev
5. Build
npm run build

Windows PowerShell:

npm.cmd run build
🧪 Demo Data

포트폴리오 시연을 위해
2026-08-29 기준의 가상 검사 데이터를 구성했습니다.

기준 데이터:

전체 검사     10
대기           7
검사중         2
완료           1
응급           2

모든 환자, 의료진, 검사 정보는
포트폴리오 시연을 위한 가상 데이터입니다.

🔑 Demo Accounts

역할별 테스트 계정이 구성되어 있습니다.

Administrator
Radiologic Technologist
Radiologist

보안을 위해 실제 로그인 비밀번호 및
민감한 인증정보는 공개 GitHub 저장소에 포함하지 않습니다.

🎯 Key Implementation Points

이 프로젝트를 통해 다음 내용을 직접 구현하고 학습했습니다.

의료 영상정보 시스템 Workflow 설계

React 기반 업무 시스템 UI

Supabase Database 연동

Supabase Auth 로그인

사용자 Role 관리

RBAC 권한 분리

Row Level Security

PostgreSQL RPC

검사 상태 Workflow

검사 안전 체크리스트

장비 상태 동적 계산

판독 Workflow

Database / UI 상태 동기화

Git / GitHub 버전 관리

Vercel 배포
💡 Troubleshooting Experience

개발 과정에서 단순 UI 제작뿐 아니라
실제 데이터 흐름과 권한 문제를 직접 해결했습니다.

대표적으로 판독 완료 과정에서:

reports 저장 성공
        ↓
exams 상태 UPDATE
        ↓
RLS에 의해 0 rows

문제를 분석한 뒤,
전문의에게 exams 전체 UPDATE 권한을 개방하는 대신
판독 상태 변경 전용 RPC를 구현했습니다.

이를 통해:

UI 권한 제어
+
Database RLS
+
제한형 RPC

구조로 권한을 분리했습니다.

🚀 Deployment

Vercel을 이용하여 배포합니다.

배포 환경에서는 다음 환경 변수를 설정해야 합니다.

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Live Demo

추후 Vercel 배포 주소 입력:

https://YOUR-PROJECT.vercel.app
📷 Screenshots

추후 주요 화면 이미지를 추가할 예정입니다.

추천 화면:

1. Login
2. Dashboard
3. 검사 Worklist
4. 검사 안전 체크리스트
5. 판독 관리
6. 장비 관리
⚠️ Disclaimer

본 프로젝트는 취업 포트폴리오 및
의료정보시스템 학습 목적으로 제작된
RIS Prototype입니다.

실제 의료기관에서 사용하기 위한
의료기기 또는 의료정보시스템으로 검증된 프로그램이 아닙니다.
실제 환자의 개인정보 및 의료정보는 포함하지 않습니다.
