# openapi-projector

OpenAPI JSON에서 프론트엔드용 DTO/API 후보 코드를 생성하는 standalone CLI입니다.

이 저장소는 **도구 저장소**입니다. 산출물은 이 저장소가 아니라 대상 서비스 프로젝트의 `openapi/` 폴더에 생성됩니다.

## 빠른 시작

### 1. 로컬 설정 만들기

```bash
cp .openapi-projector.local.example.jsonc .openapi-projector.local.jsonc
```

`.openapi-projector.local.jsonc`에 두 값만 채웁니다.

```jsonc
{
  "projectRoot": "/path/to/service-app",
  "initDefaults": {
    "sourceUrl": "https://dev-api.example.com/v3/api-docs"
  }
}
```

- `projectRoot`: 코드를 생성할 대상 프로젝트 절대 경로
- `sourceUrl`: Swagger UI 주소가 아니라 OpenAPI JSON 주소

### 2. 점검

```bash
npm run openapi:doctor
```

OpenAPI URL 접근까지 확인하려면:

```bash
node ./bin/openapi-tool.mjs doctor --check-url
```

### 3. 후보 코드 생성

```bash
npm run openapi:prepare
```

`prepare`는 필요한 경우 `init`을 먼저 실행하고, 이후 `refresh -> rules -> project`를 이어서 실행합니다.

결과 확인 위치:

- `openapi/config/project-rules.jsonc`
- `openapi/project/src/openapi-generated`
- `openapi/project/summary.md`

## 자주 쓰는 명령

| 명령 | 역할 |
| --- | --- |
| `npm run openapi:doctor` | 로컬 설정과 대상 프로젝트 준비 상태 점검 |
| `npm run openapi:prepare` | 후보 코드까지 한 번에 생성 |
| `npm run openapi:init` | 대상 프로젝트에 `openapi/` 기본 설정 생성 |
| `npm run openapi:refresh` | OpenAPI 다운로드 + review 산출물 생성 |
| `npm run openapi:rules` | 대상 프로젝트 규칙 분석/스캐폴드 생성 |
| `npm run openapi:project` | DTO/API 후보 코드 생성 |

세부 단계가 필요할 때만 `init -> refresh -> rules -> project`를 직접 실행합니다.

## 실행 기준

- 명령은 이 도구 저장소 루트에서 실행합니다.
- `help`, `doctor`를 제외한 명령은 target project root가 필요합니다.
- target project root 우선순위:
  1. `--project-root /path/to/service-app`
  2. `.openapi-projector.local.jsonc`
  3. `.openapi-tool.local.jsonc` legacy fallback

## 생성되는 주요 산출물

```text
openapi/
  config/
    project.jsonc
    project-rules.jsonc
  review/
    catalog/
    changes/
    docs/
    generated/schema.ts
  project/
    src/openapi-generated/
    manifest.json
    summary.md
```

실제 앱 코드 반영은 자동으로 하지 않습니다. `openapi/project/` 아래 후보 코드를 사람이거나 AI가 검토한 뒤 반영합니다.

## 범위

지원:

- OpenAPI `3.0/3.1 JSON`
- React/Next + TypeScript 프로젝트 대상 후보 코드
- 대상 프로젝트의 기존 HTTP client를 사용하는 wrapper 생성

아직 범위 밖:

- OpenAPI 2.0
- YAML
- Vue
- React Query hooks
- Ajv/Zod 런타임 검증

## 문서

- 개념: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- 현재 구조: [docs/10-current-structure-and-config.md](docs/10-current-structure-and-config.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
- 제품/요구사항: [docs/05-product-plan.md](docs/05-product-plan.md), [docs/06-requirements-spec.md](docs/06-requirements-spec.md), [docs/07-gap-analysis.md](docs/07-gap-analysis.md)
