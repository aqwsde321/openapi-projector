# openapi-workflow

OpenAPI 스펙으로부터 프론트엔드용 `DTO/API 후보 코드`를 만드는 standalone CLI 도구입니다.

중요한 기준은 두 가지입니다.

- 이 저장소는 **도구 저장소**입니다.
- 실제 작업 산출물은 **대상 서비스 프로젝트 안의 `openapi/` 폴더**에 생성됩니다.

즉 이 저장소 안에 결과물을 쌓는 게 아니라, 이 저장소에서 명령을 실행해 다른 프로젝트를 조작합니다.

## 현재 MVP 범위

- 입력: OpenAPI `3.0/3.1 JSON`
- 출력:
  - review 문서
  - `schema.ts`
  - 태그 폴더 내부 엔드포인트별 `*.dto.ts`
  - 태그 폴더 내부 엔드포인트별 `*.api.ts`
- 대상: React/Next + TypeScript 프로젝트
- API 호출 방식: 대상 프로젝트의 기존 HTTP client를 adapter로 감싸서 사용

아직 범위 밖인 것:

- OpenAPI 2.0
- YAML
- Vue
- React Query hooks
- Ajv/Zod 런타임 검증

## 추가 문서

- 실행 순서를 더 자세히 보고 싶을 때: [docs/02-target-project-usage.md](docs/02-target-project-usage.md)
- 설정값 확인: [docs/04-config-reference.md](docs/04-config-reference.md)
- 현재 생성 구조 확인: [docs/10-current-structure-and-config.md](docs/10-current-structure-and-config.md)
- 개념 설명: [docs/01-concepts.md](docs/01-concepts.md)
- 도구 자체 수정: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)

## 실행 모델

- 명령은 **대상 프로젝트가 아니라 이 도구 저장소 루트에서 실행**하는 것을 기준으로 합니다.
- `help`를 제외한 모든 명령은 **target project root** 가 필요합니다.
- target project root 우선순위:
  1. `--project-root /path/to/service-app`
  2. 도구 저장소 루트의 `.openapi-tool.local.jsonc` 의 `projectRoot`
- 둘 다 없으면 실행되지 않습니다.

## 빠른 시작

### 1. 로컬 실행 설정 파일 준비

도구 저장소 루트의 `.openapi-tool.local.jsonc` 를 바로 수정합니다.

기본 템플릿:

```jsonc
{
  "projectRoot": "",
  "initDefaults": {
    "sourceUrl": "",
    "applyTargetSrcDir": ""
  }
}
```

역할:

- `projectRoot`: 어느 서비스 프로젝트를 조작할지 결정
- `initDefaults`: `init` 시 대상 프로젝트 `openapi/config/project.jsonc`에 기본값으로 채워 넣을 값
- `sourceUrl`에는 Swagger UI 주소가 아니라 OpenAPI JSON 요청 URL을 넣어야 함
- 예: `https://dev-api.example.com/v3/api-docs`
- `applyTargetSrcDir`를 비워 두면 대상 프로젝트 기본값 `src/openapi-generated` 를 사용

예:

```jsonc
{
  "projectRoot": "/path/to/service-app",
  "initDefaults": {
    "sourceUrl": "https://dev-api.example.com/v3/api-docs",
    "applyTargetSrcDir": ""
  }
}
```

### 2. bootstrap 생성

```bash
npm run openapi:init
```

위 명령을 실행하면 대상 프로젝트 안에 아래가 생성됩니다.

```text
openapi/
  .gitignore
  config/
    project.jsonc
    project-rules.jsonc
```

생성 의미:

- `openapi/config/project.jsonc`
  - OpenAPI 원본 URL, review 출력 위치, apply 대상 경로 같은 실행 설정
- `openapi/config/project-rules.jsonc`
  - 대상 프로젝트 HTTP client import 경로, adapter 방식, 폴더명 규칙 같은 프로젝트 맞춤 설정
- `openapi/.gitignore`
  - 내려받은 OpenAPI 원본 JSON 같은 내부 작업 파일을 git 추적에서 제외

### 3. review 산출물 생성

```bash
npm run openapi:refresh
```

생성 위치:

- `openapi/review/catalog/endpoints.md`
  - 전체 endpoint 목록을 사람이 읽기 좋게 정리한 문서
- `openapi/review/changes/summary.md`
  - 이전 review 결과와 비교한 변경 요약
- `openapi/review/docs/*.md`
  - endpoint별 설명 문서
- `openapi/review/generated/schema.ts`
  - OpenAPI 전체를 TypeScript 타입으로 변환한 내부 기준 타입 파일

### 4. 프로젝트 규칙 분석

```bash
npm run openapi:rules
```

생성 위치:

- `openapi/review/project-rules/analysis.md`
  - 현재 프로젝트에서 찾은 fetch helper, config 타입, import 후보를 정리한 분석 문서
- `openapi/config/project-rules.jsonc`
  - `project` 단계가 실제로 읽는 deterministic 규칙 파일

이 단계 뒤에 `project-rules.jsonc`를 검토하고 필요하면 수정합니다.

### 5. DTO/API 후보 코드 생성

```bash
npm run openapi:project
```

생성 위치:

- `openapi/project/src/openapi-generated`
  - 실제 반영 전 검토용 DTO/API 후보 코드 루트
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.dto.ts`
  - 엔드포인트 요청/응답 DTO 파일
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.api.ts`
  - 엔드포인트 API wrapper 파일
- `openapi/project/src/openapi-generated/_internal/fetch-api-adapter.ts`
  - 대상 프로젝트의 기존 HTTP client와 generated API를 연결하는 adapter
- `openapi/project/manifest.json`
  - `apply`가 복사할 파일 목록
- `openapi/project/summary.md`
  - 이번 생성 결과 요약 문서

### 6. 실제 `src` 반영

```bash
npm run openapi:apply
```

기본 반영 위치:

- `src/openapi-generated`

적용 결과:

- `project` 단계에서 만든 후보 코드가 대상 프로젝트 실제 `src/openapi-generated`로 복사됩니다.
- 이후에는 앱 코드에서 generated DTO/API를 실제 import 해 사용할 수 있습니다.

핵심 원칙:

- `apply` 전까지는 대상 프로젝트 실제 `src`를 건드리지 않습니다.
- 실제 코드 변경은 `apply`에서만 일어납니다.

## 권장 명령 순서

```bash
npm run openapi:init
npm run openapi:refresh
npm run openapi:rules

# openapi/config/project-rules.jsonc 검토

npm run openapi:project

# openapi/project/src/openapi-generated 검토

npm run openapi:apply
```

위 순서만 따르면 일단 사용할 수 있습니다.

`npm` 대신 `pnpm`을 쓰는 환경이면 아래처럼 실행해도 됩니다.

```bash
pnpm run openapi:init
pnpm run openapi:refresh
pnpm run openapi:rules
pnpm run openapi:project
pnpm run openapi:apply
```

## 현재 생성 구조

`project` 실행 후 후보 코드는 아래처럼 생성됩니다.

```text
openapi/
  project/
    src/
      openapi-generated/
        schema.ts
        _internal/
          fetch-api-adapter.ts
          type-helpers.ts
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
  _internal/
    fetch-api-adapter.ts
    type-helpers.ts
  schema.ts
  index.ts
```

## 명령 요약

| 명령 | 역할 |
| --- | --- |
| `openapi:init` | 대상 프로젝트 안에 `openapi/` bootstrap 생성 |
| `openapi:download` | `sourceUrl` 기준으로 OpenAPI 원본 다운로드 |
| `openapi:catalog` | endpoint 목록과 변경 요약 생성 |
| `openapi:generate` | review 문서와 `schema.ts` 생성 |
| `openapi:rules` | 대상 프로젝트를 분석해 규칙 scaffold 생성 |
| `openapi:project` | `schema.ts + adapter + 태그 폴더 내부 엔드포인트별 DTO/API` 후보 생성 |
| `openapi:apply` | 후보 코드를 실제 `src`에 반영 |
| `openapi:refresh` | `download + catalog + generate` |

## 자주 보는 설정

### 도구 저장소 로컬 설정

- 파일: `.openapi-tool.local.jsonc`
- 용도: target project root + `init` 기본값

### 대상 프로젝트 설정

- `openapi/config/project.jsonc`
  - `sourceUrl`
  - `sourcePath`
  - `projectGeneratedSrcDir`
  - `applyTargetSrcDir`
- `openapi/config/project-rules.jsonc`
  - `fetchApiImportPath`
  - `fetchApiSymbol`
  - `axiosConfigImportPath`
  - `axiosConfigTypeName`
  - `adapterStyle`
  - `tagFileCase`

자세한 필드 설명은 [docs/04-config-reference.md](docs/04-config-reference.md) 에 있습니다.

## 현재 상태

- standalone CLI prototype 수준까지 정리됨
- `openapi-typescript` 기반 `schema.ts` 생성 도입
- `project` 단계에서 엔드포인트별 DTO/API 후보 코드 생성
- raw tag title 폴더명 사용 가능
- `.openapi-tool.local.jsonc` 기반 target project root 지정 지원

미완성 영역:

- config schema validation
- YAML / OAS2 지원
- 상위 수준 hook/client 생성
