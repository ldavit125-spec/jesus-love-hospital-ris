# 예수사랑병원 RIS 이전·운영 가이드

## 절대 UI 변경 금지

> **절대 기존 UI를 변경하지 마라.**

교육원 이전과 배포 작업은 설정·환경·문서만 수정한다. `app/page.tsx`, `app/globals.css`의 레이아웃, 색상, 문구, 간격, 컴포넌트 구조는 임의로 변경하거나 삭제하지 않는다.

## 중요 사항

- Worklist·근무 현황·장비 관리가 동일한 날짜·장비 배정 및 상태 데이터를 사용한다.
- 검사 상태는 `대기 / 검사중 / 완료`이며 완료 건은 기본 Worklist에서 제외한다.
- TTS는 X-ray·CT·MRI·Ultrasound·Mammo의 대기 환자만 호출하고 C-arm·Portable은 제외한다.
- 방송에는 환자명과 검사실만 사용하며 환자번호·검사명 등 민감정보를 포함하지 않는다.
- HIS/EMR/PACS 연동, 장비 코드 매핑, CT/MRI 안전 확인사항을 운영 전 점검한다.

## 배포·장애 주의

- `main` 직접 실험을 피하고 브랜치·커밋·원격 대상을 먼저 확인한다.
- Vercel은 `VERCEL=1 vite build` 후 `.vercel/output` 생성을 확인한다.
- Cloudflare/Wrangler 설정은 삭제하지 않는다.
- 500 오류는 기능을 추측해 삭제하지 말고 Runtime 로그와 stack trace를 먼저 확인한다.
- reset, force push, 초기화, 백업 삭제를 금지한다.
