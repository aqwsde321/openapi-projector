# Current Structure And Config

이 문서는 **현재 생성 구조와 명령 책임**만 빠르게 보여줍니다.

실행 순서는 [02-target-project-usage.md](./02-target-project-usage.md), 설정 필드는 [04-config-reference.md](./04-config-reference.md)를 보면 됩니다.

## 한눈에 보기

현재 흐름은 이렇습니다.

1. `refresh`
   - review 산출물 생성
2. `rules`
   - 대상 프로젝트 규칙 분석
3. `project`
   - 실제 반영 전 DTO/API 후보 코드 생성

핵심 원칙:

- 이 도구는 검토 가능한 후보 코드 생성까지를 담당합니다.
- 실제 프로젝트 반영은 사람이거나 AI가 `project` 결과를 보고 진행합니다.

## 현재 생성 구조

`project` 실행 후 기본 구조:

```text
openapi/
  project/
    src/
      openapi-generated/
        schema.ts
        <tag>/
          <endpoint>.dto.ts
          <endpoint>.api.ts
          index.ts
        index.ts
```

예:

```text
openapi/project/src/openapi-generated/
  199 - [BOS]원문 노출 API/
    get-banner.dto.ts
    get-banner.api.ts
    index.ts
  Users/
    get-user-by-id.dto.ts
    get-user-by-id.api.ts
    index.ts
  schema.ts
  index.ts
```

## 명령별 역할

### `init`

대상 프로젝트 안에 `openapi/` bootstrap 생성

생성:

- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

### `refresh`

아래를 한 번에 실행:

- `download`
- `catalog`
- `generate`

생성:

- `openapi/review/catalog/*`
- `openapi/review/changes/*`
- `openapi/review/docs/*.md`
- `openapi/review/generated/schema.ts`

### `rules`

대상 프로젝트를 분석해 규칙 scaffold 생성

생성:

- `openapi/review/project-rules/analysis.md`
- `openapi/config/project-rules.jsonc`

### `project`

후보 코드 생성

생성:

- `openapi/project/src/openapi-generated/<tag>/<endpoint>.dto.ts`
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.api.ts`
- `openapi/project/manifest.json`
- `openapi/project/summary.md`

설정값은 [04-config-reference.md](./04-config-reference.md)만 보면 됩니다.
