# Config Reference

이 문서는 `project.jsonc`와 `project-rules.jsonc`의 의미를 설명합니다.

## `project.jsonc`

기본 위치:

- `openapi/config/project.jsonc`

역할:

- OpenAPI 원본 위치
- review 산출물 위치
- project 후보 위치
- apply 대상 위치

### 필드

- `sourceUrl`
  - Swagger/OpenAPI 원본 URL
  - `download`, `refresh`에서 사용
- `sourcePath`
  - 내려받은 OpenAPI JSON 저장 경로
- `catalogJsonPath`
  - 전체 endpoint catalog JSON 출력 경로
- `catalogMarkdownPath`
  - 사람이 보는 전체 endpoint 목록 Markdown 경로
- `docsDir`
  - review용 endpoint 문서 출력 폴더
- `endpointsDir`
  - review용 raw endpoint helper 출력 폴더
- `projectRulesAnalysisPath`
  - `rules` 명령이 생성하는 분석 문서 경로
- `projectRulesPath`
  - `project` 명령이 읽는 규칙 파일 경로
- `projectGeneratedSrcDir`
  - `project` 명령이 생성하는 후보 코드 루트
- `applyTargetSrcDir`
  - `apply` 명령이 반영할 실제 src 루트

## `project-rules.jsonc`

기본 위치:

- `openapi/config/project-rules.jsonc`

역할:

- 프로젝트 맞춤 규칙을 사람이 먼저 명시
- `project` 명령이 deterministic 하게 읽어 변형

### `api`

- `fetchApiImportPath`
  - 생성 API 파일에서 `fetchAPI`를 import 할 경로
- `fetchApiSymbol`
  - 실제 fetch helper 이름
- `axiosConfigImportPath`
  - config 타입 import 경로
- `axiosConfigTypeName`
  - config 타입 이름
- `apiUrlsImportPath`
  - 향후 `API_URLS` 매핑에 사용할 import 경로
- `pathSource`
  - 현재는 보통 `literal`

### `types`

- `commonTypesImportPath`
  - 공통 응답 타입 import 경로
- `responseTypeName`
  - 일반 응답 래퍼 타입 이름
- `pagedResponseTypeName`
  - 페이징 응답 래퍼 타입 이름
- `pageRequestTypeName`
  - 페이지 요청 공통 타입 이름

### `generation`

- `queryFlattenStrategy`
  - query object flatten 전략
- `responseWrapperStrategy`
  - jsend 등 응답 래퍼를 어떤 프로젝트 타입으로 바꿀지
- `multipartStrategy`
  - multipart body 처리 전략

## Config Discovery

도구는 현재 작업 디렉터리 기준으로 아래 순서로 config를 찾습니다.

1. `openapi.config.jsonc`
2. `openapi/config/project.jsonc`
3. `config/project.jsonc`

즉 동일 도구를 다른 프로젝트 구조에서도 일정 수준 재사용할 수 있습니다.
