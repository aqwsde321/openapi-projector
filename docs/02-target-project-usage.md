# Target Project Usage

이 문서는 “이 도구를 다른 서비스 프로젝트에 어떻게 적용하는지”만 설명합니다.

## 전제

- 도구 저장소 위치: `/path/to/openapi-workflow`
- 적용 대상 프로젝트 위치: `/path/to/service-app`

중요:

- 명령은 **항상 대상 프로젝트 루트에서 실행**합니다.
- 도구 저장소 안에서 실행하지 않습니다.

## 1. `openapi/` bootstrap 생성

```bash
cd /path/to/service-app
node /path/to/openapi-workflow/bin/openapi-tool.mjs init
```

생성되는 파일:

- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

## 2. Swagger 주소 설정

아래 파일을 열어 `sourceUrl`을 실제 Swagger 주소로 수정합니다.

- `openapi/config/project.jsonc`

예:

```jsonc
{
  "sourceUrl": "https://dev-api.example.com/v3/api-docs"
}
```

## 3. review 산출물 생성

```bash
node /path/to/openapi-workflow/bin/openapi-tool.mjs refresh
```

확인 위치:

- `openapi/review/changes/summary.md`
- `openapi/review/catalog/endpoints.md`
- `openapi/review/docs/*.md`
- `openapi/review/generated/schema.ts`

## 4. 프로젝트 규칙 분석

```bash
node /path/to/openapi-workflow/bin/openapi-tool.mjs rules
```

확인 위치:

- `openapi/review/project-rules/analysis.md`
- `openapi/config/project-rules.jsonc`

이 단계에서는 사람이 또는 AI가 `project-rules.jsonc`를 검토하고 수정합니다.

## 5. 프로젝트 후보 코드 생성

```bash
node /path/to/openapi-workflow/bin/openapi-tool.mjs project
```

확인 위치:

- `openapi/project/src/openapi-generated`
- `openapi/project/src/openapi-generated/schema.ts`
- `openapi/project/src/openapi-generated/apis/*.ts`
- `openapi/project/src/openapi-generated/_internal/fetch-api-adapter.ts`
- `openapi/project/summary.md`

## 6. 실제 `src` 반영

```bash
node /path/to/openapi-workflow/bin/openapi-tool.mjs apply
```

기본 반영 위치:

- `src/openapi-generated`

## 권장 순서

```bash
cd /path/to/service-app
node /path/to/openapi-workflow/bin/openapi-tool.mjs init

# sourceUrl 수정

node /path/to/openapi-workflow/bin/openapi-tool.mjs refresh
node /path/to/openapi-workflow/bin/openapi-tool.mjs rules

# project-rules.jsonc 검토/수정

node /path/to/openapi-workflow/bin/openapi-tool.mjs project

# openapi/project/src/openapi-generated 확인

node /path/to/openapi-workflow/bin/openapi-tool.mjs apply
```

## 주의사항

- `download`와 `refresh`는 `sourceUrl`이 설정되지 않으면 실패합니다.
- `project`는 `project-rules.jsonc`가 있어야 합니다.
- `apply`는 마지막 단계에서만 실행하는 것이 맞습니다.
- 대상 프로젝트의 `openapi/`는 도구 저장소와 별개입니다.
