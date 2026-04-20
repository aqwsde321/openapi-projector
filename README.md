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

## 실행 모델

- 명령은 **대상 프로젝트가 아니라 이 도구 저장소 루트에서 실행**하는 것을 기준으로 합니다.
- `help`를 제외한 모든 명령은 **target project root** 가 필요합니다.
- target project root 우선순위:
  1. `--project-root /path/to/service-app`
  2. 도구 저장소 루트의 `.openapi-tool.local.jsonc` 의 `projectRoot`
- 둘 다 없으면 실행되지 않습니다.

## 빠른 시작

### 1. `.openapi-tool.local.example.jsonc` 복사

```bash
cp .openapi-tool.local.example.jsonc .openapi-tool.local.jsonc
```

그 다음 `.openapi-tool.local.jsonc` 에서 필수값만 채웁니다.

```jsonc
{
  "projectRoot": "/path/to/service-app",
  "initDefaults": {
    "sourceUrl": "https://dev-api.example.com/v3/api-docs"
  }
}
```

- `projectRoot`: 대상 프로젝트 절대 경로
- `sourceUrl`: OpenAPI JSON 요청 URL

### 2. 검토 단계

```bash
npm run openapi:init
npm run openapi:refresh
npm run openapi:rules
npm run openapi:project
```

여기까지는 검토 단계입니다.

- `rules` 뒤: `openapi/config/project-rules.jsonc` 확인
- `project` 뒤: `openapi/project/src/openapi-generated` 확인

### 3. 실제 반영

```bash
npm run openapi:apply
```

- `apply`는 마지막 단계입니다.
- 이 명령부터 대상 프로젝트 실제 `src`를 변경합니다.
- `project` 결과를 확인한 뒤에만 실행하는 것이 맞습니다.
- `apply` 뒤: `src/openapi-generated` 확인

## 단계별 설명

### 1. `npm run openapi:init`

생성:

- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

의미:

- `project.jsonc`
  - OpenAPI 원본 URL, review 출력 위치, apply 대상 경로 같은 실행 설정
- `project-rules.jsonc`
  - 대상 프로젝트 HTTP client import 경로, adapter 방식, 폴더명 규칙 같은 프로젝트 맞춤 설정
- `.gitignore`
  - 내려받은 OpenAPI 원본 JSON 같은 내부 작업 파일을 git 추적에서 제외

### 2. `npm run openapi:refresh`

생성:

- `openapi/review/catalog/endpoints.md`
- `openapi/review/changes/summary.md`
- `openapi/review/docs/*.md`
- `openapi/review/generated/schema.ts`

의미:

- `endpoints.md`
  - 전체 endpoint 목록
- `summary.md`
  - 이전 결과와 비교한 변경 요약
- `docs/*.md`
  - endpoint별 설명 문서
- `schema.ts`
  - OpenAPI 전체를 TypeScript 타입으로 변환한 내부 기준 타입 파일

### 3. `npm run openapi:rules`

생성:

- `openapi/review/project-rules/analysis.md`
- `openapi/config/project-rules.jsonc`

의미:

- `analysis.md`
  - 현재 프로젝트에서 찾은 fetch helper import 후보를 정리한 분석 문서
- `project-rules.jsonc`
  - `project` 단계가 실제로 읽는 deterministic 규칙 파일

이 단계 뒤에 `project-rules.jsonc`를 검토하고 필요하면 수정합니다.

### 4. `npm run openapi:project`

생성:

- `openapi/project/src/openapi-generated`
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.dto.ts`
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.api.ts`
- `openapi/project/manifest.json`
- `openapi/project/summary.md`

의미:

- `openapi/project/src/openapi-generated`
  - 실제 반영 전 검토용 DTO/API 후보 코드 루트
- `<endpoint>.dto.ts`
  - 엔드포인트 요청/응답 DTO 파일
- `<endpoint>.api.ts`
  - 엔드포인트 API wrapper 파일
- `manifest.json`
  - `apply`가 복사할 파일 목록
- `summary.md`
  - 이번 생성 결과 요약 문서

### 5. `npm run openapi:apply`

동작:

- `project` 결과를 대상 프로젝트 실제 `src/openapi-generated`로 복사합니다.
- 이 단계부터 실제 앱 코드가 변경됩니다.

핵심 원칙:

- `apply` 전까지는 대상 프로젝트 실제 `src`를 건드리지 않습니다.
- 실제 코드 변경은 `apply`에서만 일어납니다.

## 추가 문서

- 실행 순서를 더 자세히 보고 싶을 때: [docs/02-target-project-usage.md](docs/02-target-project-usage.md)
- 설정값 확인: [docs/04-config-reference.md](docs/04-config-reference.md)
- 현재 생성 구조 확인: [docs/10-current-structure-and-config.md](docs/10-current-structure-and-config.md)
- 개념 설명: [docs/01-concepts.md](docs/01-concepts.md)
- 도구 자체 수정: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)

## 자주 보는 설정

### 도구 저장소 로컬 설정

- 파일: `.openapi-tool.local.jsonc`
- 용도: target project root + `init` 기본값
- 예시 파일: `.openapi-tool.local.example.jsonc`

### 대상 프로젝트 설정

- `openapi/config/project.jsonc`
  - `sourceUrl`
  - `sourcePath`
  - `projectGeneratedSrcDir`
  - `applyTargetSrcDir`
- `openapi/config/project-rules.jsonc`
  - `fetchApiImportPath`
  - `fetchApiSymbol`
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
