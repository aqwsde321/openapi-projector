# Concepts

## `openapi-tool`과 `openapi/`의 차이

이 워크플로우에서 가장 헷갈리기 쉬운 부분은 “도구 저장소”와 “대상 프로젝트 작업 폴더”가 다르다는 점입니다.

역할은 이렇게 나뉩니다.

- `openapi-tool`
  - 공용 CLI 도구 원본
  - 명령 구현, 템플릿, 공용 유틸이 들어 있습니다.
- 각 서비스 프로젝트의 `openapi/`
  - 도구가 생성하는 작업 폴더
  - 설정, review 결과물, project 후보 코드가 여기에 생깁니다.

즉 `openapi-tool`은 엔진이고, `openapi/`는 엔진이 만드는 작업 공간입니다.

## 어디서 실행해야 하나

도구는 **도구 저장소 루트에서 실행**합니다.

어느 서비스 프로젝트를 조작할지는 `.openapi-tool.local.jsonc` 또는 `--project-root`로 지정합니다.

## 단계별 역할

### 1. `refresh`

Swagger/OpenAPI 원본을 받아서 review 산출물을 만듭니다.

- `openapi/review/catalog`
- `openapi/review/changes`
- `openapi/review/docs`
- `openapi/review/generated/schema.ts`

이 단계의 목적은 “스펙을 확인하고 검토할 수 있는 review 결과물”을 만드는 것입니다.

### 2. `rules`

현재 프로젝트 구조를 분석해서, 사람이 먼저 검토해야 하는 규칙 문서와 scaffold를 만듭니다.

- `openapi/review/project-rules/analysis.md`
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
