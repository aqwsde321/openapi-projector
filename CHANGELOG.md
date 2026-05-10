# Changelog

이 파일은 `openapi-projector` npm 패키지의 사용자에게 보이는 변경 이력을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)를 느슨하게 따르고, 버전은 `package.json`의 `version` 및 Git 태그와 맞춥니다.

## Unreleased

### Changed

- 생성 README와 루트 README의 AI agent 지침을 보강해, 실제 앱 코드 반영 전에 `project-rules` 분석 근거와 기존 프로젝트 코드를 다시 확인하도록 안내했습니다.
- `project` 후보 요약과 manifest에 `project-rules` 분석 문서 경로를 기록해 AI와 사람이 적용 전에 읽어야 할 근거 파일을 더 명확히 찾을 수 있게 했습니다.
- `project.jsonc`의 산출물 경로 필드는 코드 스타일이나 앱 배치 조정용으로 임의 수정하지 말고, API client/import/call style 규칙은 `project-rules.jsonc`에서 검토하도록 문서화했습니다.

### Fixed

- custom `projectRulesAnalysisPath` 또는 `projectRulesAnalysisJsonPath`를 쓰는 경우 `doctor`, `prepare`, `project`의 review gate 안내가 실제 analysis 경로를 가리키도록 수정했습니다.

## 0.3.7 - 2026-05-07

### Added

- 기존 `openapi/` 작업 공간의 설정과 생성 결과를 보존하면서 안내 문서와 규칙 기본값을 갱신하는 `update` 명령을 추가했습니다.
- `version` 및 `--version` 명령을 추가해 npx 실행 시 실제 CLI 버전을 바로 확인할 수 있게 했습니다.

### Changed

- 기존 작업 공간에서 `init`을 다시 실행할 때 새 project config가 기존 config를 shadow하지 않도록 막고, `update` 사용을 안내하도록 변경했습니다.
- `project-rules.jsonc` 마이그레이션은 `review.rulesReviewed`와 수동 notes를 보존하면서 누락된 안전 기본값만 추가하도록 정리했습니다.
- 생성 README와 주요 CLI 안내의 npx 예시를 `openapi-projector@latest` 중심으로 맞췄습니다.

### Fixed

- custom `projectRulesPath`를 쓰는 경우 `prepare`의 안내와 에러 메시지가 실제 rules 파일 경로를 가리키도록 수정했습니다.
- 기존 수동 helper 설정에 분석된 다른 helper의 import kind/call style/path/symbol이 섞일 수 있는 edge case를 막았습니다.

## 0.3.6 - 2026-05-07

### Changed

- 루트 README를 첫 화면에서 핵심 기능, 실행 흐름, 지원 범위가 보이도록 재구성했습니다.
- `changes.md` 출력 예시와 선택적 Slack 알림 안내를 README에 추가했습니다.
- AI agent에게 맡기는 프롬프트를 접힌 상세 영역이 아닌 독립 섹션으로 옮겼습니다.

## 0.3.5 - 2026-05-07

### Fixed

- `changes.md`의 계약 변경 요약을 endpoint 아래에 들여쓴 표로 표시해 endpoint별 구분이 더 명확해지도록 수정했습니다.
- enum 변경을 배열 전체 변경 대신 추가/삭제된 enum 값 단위로 표시하도록 수정했습니다.
- schema 교체나 필드 삭제에서 required/optional 변경 노이즈가 중복 표시되는 문제를 줄였습니다.
- 전체 AS-IS/TO-BE 비교는 실제 표시할 변경이 있는 endpoint에서만 접힌 상세 영역으로 출력하도록 정리했습니다.

## 0.3.4 - 2026-05-06

### Added

- `changes.md`의 추가/문서 변경 endpoint에 선택적 Swagger UI deep link를 표시하도록 추가했습니다.
- `swaggerUiUrl` 설정과 GitHub Actions의 `DEV_SWAGGER_UI_URL` 연동 예시를 추가했습니다.

### Changed

- `Contract Changed` 요약을 AS-IS/TO-BE 행 단위 비교표로 바꿔 요청/응답 구조와 변경 라인이 같은 줄에 맞춰 보이도록 개선했습니다.
- 계약 변경 미리보기의 필드 필수 여부를 `field: Type (required)` / `field: Type (optional)` 형태로 표시하도록 정리했습니다.
- `Added`/`Removed` 섹션은 endpoint 목록 중심으로 단순화하고, 삭제 endpoint는 전체 취소선으로 표시하도록 변경했습니다.

## 0.3.3 - 2026-05-06

### Fixed

- `changes.md`의 endpoint 항목 제목에서 generated id를 제거해 method/path/summary 중심으로 읽히도록 정리했습니다.
- 점이 포함된 OpenAPI schema 이름을 비교할 때 Java 스타일 변경 목록에 `"];` 같은 깨진 선언이 표시되는 문제를 수정했습니다.
- schema root의 `type: object` 추가/삭제 줄이 불필요한 `Map<String, Object> ...` 변경으로 표시되는 노이즈를 줄였습니다.
- OpenAPI schema 이름만 바뀐 경우 필드 삭제/추가처럼 중복 표시하지 않고 schema 참조 변경으로 요약하되, 실제 필드 타입/required 변경은 별도로 표시하도록 수정했습니다.

## 0.3.2 - 2026-05-06

### Added

- 백엔드 CI에서 OpenAPI 변경 리포트를 Slack으로 공지하는 GitHub Actions 예제와 적용 가이드를 추가했습니다.

### Changed

- `catalog` 변경 리포트의 계약 변경 상세를 Slack에서 읽기 쉬운 한 줄 변경 목록으로 개선했습니다.

## 0.3.1 - 2026-05-04

### Changed

- GET query object parameter가 기본 `form` + `explode` 직렬화일 때 `pageable?: Pageable`, `condition?: SearchCondition` 같은 wrapper 필드 대신 `page`, `size`, 검색 조건 필드를 request DTO 최상위에 펼쳐 생성하도록 변경했습니다. 이 변경은 새로 생성하는 DTO/API/hook 후보에만 반영되며, 이미 앱 코드에 복사된 기존 DTO/API 파일은 자동으로 수정되지 않습니다.

## 0.3.0 - 2026-05-02

### Added

- React Query 사용 프로젝트를 감지해 `project-rules.jsonc`에 `hooks` 규칙을 자동 제안하도록 추가했습니다.
- `hooks.enabled=true`일 때 GET endpoint는 `*.query.ts`, POST/PUT/PATCH/DELETE endpoint는 `*.mutation.ts` 후보를 생성하도록 추가했습니다.
- hook 후보의 query key 방식, response unwrap, `STALE_TIME` import를 조정할 수 있는 `hooks` 설정 검증을 추가했습니다.

### Changed

- 생성 요약과 프로젝트 README가 DTO/API 후보뿐 아니라 선택적 React Query hook 후보도 함께 안내하도록 업데이트했습니다.
- 기존 `project-rules.jsonc`에도 React Query 감지 결과를 바탕으로 `hooks` 기본값을 보강하되, 사용자가 명시한 `hooks.enabled=false`는 유지하도록 변경했습니다.

## 0.2.2 - 2026-05-02

### Added

- 기존 `openapi/README.md` 안내 문서만 최신 템플릿으로 갱신하는 `upgrade-docs` 명령을 추가했습니다.
- 최신 Swagger/OpenAPI 변경 비교 진입점으로 `openapi/changes.md`와 `openapi/changes.json`을 생성하도록 추가했습니다.
- CLI 성공/실패/경고 로그에 상태 표시를 추가하고, `prepare`가 실행하는 단계를 명령별로 더 명확히 표시하도록 개선했습니다.

### Changed

- 루트 README는 Swagger/OpenAPI 변경 비교를 주요 기능으로 먼저 설명하고, 생성되는 프로젝트 README도 변경 비교 문서를 DTO/API 후보 반영보다 먼저 확인하도록 정리했습니다.
- 생성되는 `openapi/README.md`를 `init` 이후 바로 볼 수 있는 빠른 시작 흐름으로 재구성했습니다.

### Removed

- 기본 변경 비교 표보다 설명력이 낮던 선택적 `oasdiff` 호환성 리포트 통합을 제거했습니다.

## 0.2.1 - 2026-04-30

### Added

- 대화형 `init`의 URL 확인이 실패했을 때 `skip` 입력으로 마지막 `sourceUrl`을 그대로 저장하고 진행할 수 있게 추가했습니다.

## 0.2.0 - 2026-04-30

### Added

- `catalog` 변경 요약에 선택적 `oasdiff` 호환성 리포트 병합을 추가했습니다.
- `summary.json`의 `externalDiff.oasdiff`와 `summary.md`의 `Compatibility Check` 섹션을 추가했습니다.
- `init` 실행 시 터미널 환경에서 기본 `sourceUrl`을 보여주고 변경 값을 입력받는 프롬프트를 추가했습니다.
- `init` 대화형 프롬프트에서 입력한 `sourceUrl`을 즉시 확인하고, 실패 시 대표 OpenAPI 경로 자동 탐색과 재입력을 지원하도록 추가했습니다.
- `init` 완료 로그에 `sourceUrl`을 나중에 수정할 설정 파일 경로와 `file://` 링크를 표시하도록 추가했습니다.
- AI에게 작업을 맡기기 전 사람이 `prepare`로 생성되는 검토 자료를 확인하는 README 안내를 추가했습니다.

### Fixed

- `oasdiff` required 모드에서 기준 파일이 없을 때 호환성 검사가 우회되지 않도록 수정했습니다.
- `oasdiff` off 모드가 기준 파일을 갱신하지 않도록 수정했습니다.
- `init --source-url` 적용 여부를 CLI 출력에서 실제 설정값으로 확인할 수 있게 수정했습니다.
- 우선순위가 높은 기존 OpenAPI config가 있을 때 `init`이 사용되지 않는 하위 config를 만들지 않도록 수정했습니다.
- 우선순위가 낮은 기존 OpenAPI config는 `init` 대상 config 생성을 막지 않도록 수정했습니다.

## 0.1.4 - 2026-04-29

### Added

- 생성 README가 소스 checkout 실행 방식과 npm 패키지 실행 방식을 구분하도록 안내를 추가했습니다.
- 생성 README의 핵심 문구와 CLI 출력에 대한 회귀 테스트를 추가했습니다.

### Changed

- 기본 OpenAPI JSON URL을 `http://localhost:8080/v3/api-docs`로 설정했습니다.
- 루트 README의 빠른 시작을 기본 `init` 중심으로 단순화했습니다.
- 생성 README의 AI 프롬프트를 접지 않고 바로 복사할 수 있게 변경했습니다.
- 생성 README에서 첫 `prepare`가 `rules` 검토 단계에서 멈추는 것이 정상임을 명확히 했습니다.
- 변경 요약의 계약 변경 라벨을 request body, response body, parameter 사용처 기준으로 구분했습니다.

### Fixed

- 변경 요약에서 schema property 사용처가 요청/응답 맥락과 맞게 표시되도록 보강했습니다.
- OpenAPI `required` 배열 변경 감지를 검증하는 테스트를 추가했습니다.

## 0.1.3 - 2026-04-29

### Fixed

- Linux 환경에서 경로 대소문자 차이로 실패하던 테스트 기대값을 수정했습니다.

## 0.1.2 - 2026-04-29

### Changed

- npm 배포 자동화 검증을 위한 릴리스 준비를 반영했습니다.

## 0.1.1 - 2026-04-29

### Added

- GitHub Actions 기반 npm Trusted Publishing 배포 흐름을 추가했습니다.
- OpenAPI 변경 이력 비교표와 후보 파일 링크를 문서화했습니다.
- 프로젝트 규칙 검증, 설정 경로 검증, flat 출력 배치, media type 선택을 추가했습니다.

### Changed

- README 사용 흐름과 프로젝트 경로 예시 문구를 정리했습니다.
- 프로젝트 엔드포인트 투영 단계를 분리해 유지보수 구조를 개선했습니다.

### Fixed

- `doctor`의 OpenAPI 원본 검증을 강화했습니다.
- 프로젝트 규칙 scaffold 갱신과 검토 게이트 동작을 안정화했습니다.
