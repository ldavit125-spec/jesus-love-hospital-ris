# RIS → PACS → Viewer 인수인계 가이드

## 현재 작업 저장소

- 프로젝트: `C:\Users\Asus\Desktop\이임원\Jesus Love Hospital-RIS`
- 브랜치: `restore/ris-pacs-link`
- 최신 commit: `91a2eb29b8f4477765843ad5c3682e105c928d58`
- 원격: `origin/restore/ris-pacs-link`
- Git 상태: clean
- 변경 목적: PACS 매핑 조회에서 화면 표시 번호와 DB PK가 혼동되지 않도록 DB PK 사용을 명시

## 가장 중요한 ID 구분

정현우 Chest PA는 다음 값을 반드시 구분한다.

| 용도 | 값 |
|---|---|
| 화면 표시 검사번호 `patient_id` | `202608-01458` |
| 실제 DB PK `public.exams.id` | `DEMO-CHEST-PA-001` |
| PACS link의 `exam_id` | `DEMO-CHEST-PA-001` |
| `study_instance_uid` | `2.25.950821874951897597975899502736166023675` |
| `orthanc_study_id` | `e043790a-ea2f7954-bf1dfb95-b85ed919-2bc3f907` |

PACS 조회에는 절대로 `202608-01458`을 사용하지 않는다. `getPacsStudyLinks()`에 전달하는 값과 Map 조회 키는 항상 `exams.id`인 `DEMO-CHEST-PA-001`이어야 한다.

현재 핵심 흐름:

```text
getSupabaseExams()
  → res.data[].id를 dbExamIds로 추출
  → getPacsStudyLinks(dbExamIds)
  → link.exam_id를 Map key로 저장
  → mapped exam의 id = dbExamId
  → pacsStudyLink = pacsLinksByExamId.get(dbExamId)
```

`patient_id`는 Worklist와 판독 화면에 보여주는 번호로만 사용한다.

## PACS Viewer 링크

판독 관리 화면의 `PACS 영상 조회`는 Worklist 로드 때 미리 읽은 `pacs_study_links` 값을 사용해 `<a>` 링크를 만든다. 버튼 클릭 시 Supabase를 다시 조회하지 않는다.

```tsx
<a href={pacsViewerUrl} target="_blank" rel="noopener noreferrer">
  PACS 영상 조회
</a>
```

정상 URL:

```text
http://localhost:5174/?studyInstanceUid=2.25.950821874951897597975899502736166023675&orthancStudyId=e043790a-ea2f7954-bf1dfb95-b85ed919-2bc3f907
```

UID가 없으면 Viewer를 열지 않고 다음 메시지를 표시한다.

```text
PACS Study 연결 정보가 없습니다.
```

배포 환경의 팝업 차단을 피하기 위해 클릭 처리에서 `window.open()`을 다시 사용하지 않는다.

## 현재 정상 상태

- PACS 메인: `http://localhost:3000`
- RIS 로컬: `http://localhost:3001`
- Viewer: `http://localhost:5174`
- Orthanc: `http://localhost:8042`
- 직접 Viewer URL 입력: Chest PA 정상 렌더링
- 로컬 RIS anchor 클릭: 새 Viewer 탭과 정상 영상 확인
- `npm.cmd run build`: 성공

## Vercel 확인 절차

1. Vercel에서 `restore/ris-pacs-link` Preview를 연다.
2. 배포 commit이 `91a2eb2` 또는 전체 hash `91a2eb29b8f4477765843ad5c3682e105c928d58`인지 확인한다.
3. 정현우 Chest PA의 판독 관리 화면에서 `PACS 영상 조회`를 찾는다.
4. 우클릭 시 `링크 주소 복사`가 나타나는지 확인한다.
5. 복사한 주소에 다음 query가 모두 있는지 확인한다.
   - `studyInstanceUid=2.25.950821874951897597975899502736166023675`
   - `orthancStudyId=e043790a-ea2f7954-bf1dfb95-b85ed919-2bc3f907`
6. 새 탭에서 Viewer가 열리고 Chest PA가 표시되는지 확인한다.

최신 commit인데도 `PACS Study 연결 정보가 없습니다.`가 표시되면 다음을 확인한다.

- Vercel Preview의 실제 commit hash
- Vercel 환경변수가 같은 Supabase 프로젝트를 가리키는지
- Preview의 Supabase Auth 세션
- `pacs_study_links` SELECT RLS policy와 현재 로그인 role
- Network 요청의 status, response row 수, `exam_id`
- response의 `exam_id`가 `DEMO-CHEST-PA-001`인지

화면 표시 번호를 DB 조회값으로 임시 사용하지 않는다.

## 절대 금지 사항

- `202608-01458`을 `pacs_study_links.exam_id` 조회에 사용하지 않는다.
- `pacs_study_links`를 임의로 INSERT, UPDATE, DELETE하지 않는다.
- Supabase schema나 RLS policy를 임의로 변경하지 않는다.
- `public.exams`를 임의로 수정하지 않는다.
- Orthanc Study, Series, Instance를 삭제하거나 재업로드하지 않는다.
- OrthancStorage, SQLite index, DICOM 파일을 직접 수정하지 않는다.
- Viewer, Cornerstone, DICOM 처리 코드를 수정하지 않는다.
- PACS 프로젝트와 RIS 프로젝트를 혼동하지 않는다.
- 교육원 경로 `D:\이임원\04\_바이브코딩\jesus-love-hospital-ris`를 집 PC 작업 경로로 사용하지 않는다.
- 정현우의 오래된 Knee AP/LAT fallback을 되살리지 않는다.
- 판독문 입력, 판독 완료, 판독 상태 기능을 삭제하거나 변경하지 않는다.
- `protocols` 테이블을 새로 만들거나 seed를 다시 실행하지 않는다.
- 검증 전 `main`에 merge하거나 작업을 reset하지 않는다.

## 변경 전 검증 명령

```powershell
cd 'C:\Users\Asus\Desktop\이임원\Jesus Love Hospital-RIS'
git status
git branch --show-current
git log -1 --oneline
npm.cmd run build
```

변경 후 다음을 확인한다.

- Git diff에 Viewer, Orthanc, DICOM 프로젝트 파일이 없는가
- `getPacsStudyLinks()`가 `exams.id`를 받는가
- `displayExamNumber`가 PACS 조회에 사용되지 않는가
- PACS link가 있을 때 `<a href>`가 생성되는가
- link가 없을 때 기본 Viewer 주소를 열지 않는가
- 로그인, 판독문 저장, protocol 기능이 유지되는가
- build가 성공하는가

## 커밋 및 배포 주의

현재 commit `91a2eb2`는 원격 `restore/ris-pacs-link`에 push되어 있다. 새 수정은 먼저 해당 브랜치에서 확인하고, build와 Vercel Preview 검증이 끝난 뒤에만 추가 commit/push한다. Vercel Preview가 새 commit을 배포했는지는 commit hash로 확인한다.


