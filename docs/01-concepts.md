# Concepts

## `openapi-projector`와 `openapi/`의 차이

이 워크플로우에서 가장 헷갈리기 쉬운 부분은 “도구 저장소”와 “대상 프로젝트 작업 폴더”가 다르다는 점입니다.

역할은 이렇게 나뉩니다.

- `openapi-projector`
  - 공용 CLI 도구 원본
  - 명령 구현, 템플릿, 공용 유틸이 들어 있습니다.
  - CLI 명령은 `openapi-projector`와 legacy alias `openapi-tool`을 모두 지원합니다.
- 각 서비스 프로젝트의 `openapi/`
  - 도구가 생성하는 작업 폴더
  - 설정, review 결과물, project 후보 코드가 여기에 생깁니다.

즉 `openapi-projector`는 엔진이고, `openapi/`는 엔진이 만드는 작업 공간입니다.

## 어디서 실행해야 하나

도구는 **프론트엔드 프로젝트 루트에서 실행**합니다.

기본 대상 프로젝트는 현재 실행 디렉터리입니다. 다른 위치를 조작해야 할 때만 `--project-root` 또는 `.openapi-projector.local.jsonc`의 `projectRoot`를 사용합니다.

## 단계별 역할

### 1. `refresh`

Swagger/OpenAPI 원본을 받아서 review 산출물을 만듭니다.

- `openapi/review/catalog`
- `openapi/review/changes`
- `openapi/review/docs`
- `openapi/review/generated/schema.ts`

이 단계의 목적은 “스펙을 확인하고 검토할 수 있는 review 결과물”을 만드는 것입니다.

`openapi/review/changes/summary.md`는 최신 비교 결과입니다. 매번 덮어쓰이며, 사람이 가장 먼저 확인하는 파일입니다.
변경이 감지되면 같은 내용이 `openapi/review/changes/history/` 아래에 timestamp가 붙은 `.md`와 `.json` 파일로도 누적됩니다.

변경 구분은 endpoint 기준입니다.

- `Added`: 새로 추가된 endpoint
- `Removed`: OpenAPI 스펙에서 사라진 endpoint
- `Contract Changed`: request, response, parameter, schema처럼 프론트 코드에 영향을 줄 수 있는 계약 변경
- `Doc Changed`: summary, description, tag처럼 계약 외 문서성 변경

`Added`, `Contract Changed`, `Doc Changed` 항목은 `project-rules.jsonc` 기준으로 생성될 DTO/API 후보 파일 링크도 함께 표시합니다. 링크 대상은 `project` 실행 후 생기는 `openapi/project/src/openapi-generated/...` 아래 파일입니다.

`Contract Changed`는 이전 catalog와 현재 catalog 모두 비교용 snapshot을 가지고 있으면 필드 단위 상세 변경을 비교 표로 표시합니다. 예를 들어 query parameter 추가, request body required 변경, response schema field type 변경 같은 내용이 `summary.md`와 `history/*.md`에 남습니다.
이전 catalog가 snapshot이 없는 구버전 산출물이라면 첫 refresh에서는 영향 endpoint만 표시되고, 그 다음 refresh부터 상세 변경 비교가 가능합니다.

### 2. `rules`

현재 프로젝트 구조를 분석해서, 사람이 먼저 검토해야 하는 규칙 문서와 scaffold를 만듭니다.

- `openapi/review/project-rules/analysis.md`
- `openapi/review/project-rules/analysis.json`
- `openapi/config/project-rules.jsonc`

이 단계의 목적은 “프로젝트 맞춤 변환 규칙을 명시화”하는 것입니다.

### 3. `project`

`project-rules.jsonc`를 읽어, 실제 프로젝트에 적용할 후보 코드를 `openapi/` 안에 생성합니다.

- `openapi/project/src/openapi-generated`
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.dto.ts`
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.api.ts`
- `openapi/project/summary.md`

이 단계의 목적은 “실제 src 반영 전 마지막 후보”를 만드는 것입니다.

즉 이 도구의 역할은 `project` 단계까지 검토 가능한 후보 코드를 만드는 것입니다.
실제 프로젝트 반영은 사람이거나 AI가 별도로 진행합니다.
