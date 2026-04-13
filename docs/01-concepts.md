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

도구는 **현재 작업 디렉터리 기준**으로 동작합니다.

따라서:

- 도구 저장소 안에서 실행하면, 그 저장소 안에 `openapi/`가 생깁니다.
- 어떤 서비스 프로젝트에 적용하려면, 반드시 **그 서비스 프로젝트 루트로 이동한 뒤** 실행해야 합니다.

예:

```bash
cd /path/to/service-app
node /path/to/openapi-workflow/bin/openapi-tool.mjs init
```

그러면 `/path/to/service-app/openapi/`가 생성됩니다.

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
- `openapi/project/summary.md`

이 단계의 목적은 “실제 src 반영 전 마지막 후보”를 만드는 것입니다.

### 4. `apply`

후보 코드를 실제 `src` 경로에 반영합니다.

기본 대상:

- `src/openapi-generated`

즉 `apply` 전까지는 실제 앱 코드를 건드리지 않는 것이 원칙입니다.
