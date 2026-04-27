# openapi-projector

OpenAPI JSON에서 프론트엔드용 DTO/API 후보 코드를 생성하는 standalone CLI입니다.

이 도구는 **프론트엔드 프로젝트 루트에서 실행**하는 것을 기준으로 합니다. 산출물은 해당 프로젝트의 `openapi/` 폴더에 생성됩니다.

## 빠른 시작

### 0. 도구 준비

```bash
cd /path/to/openapi-projector
pnpm install
pnpm link --global
```

별도 빌드 단계는 없습니다. 전역 링크를 쓰지 않으면 프론트엔드 프로젝트에서 `node /path/to/openapi-projector/bin/openapi-tool.mjs <command>`로 실행해도 됩니다.

### 1. 프론트엔드 프로젝트에서 init

```bash
cd /path/to/frontend-project
openapi-projector init
```

`init`이 생성하는 파일:

- `.openapi-projector.local.jsonc`
- `openapi/README.md`
- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`
- `.gitignore`의 `.openapi-projector.local.jsonc` 항목

`.openapi-projector.local.jsonc`는 현재 프로젝트 기준 로컬 설정입니다. 보통 `projectRoot`는 `"."` 그대로 둡니다.
`openapi/README.md`는 해당 프론트엔드 프로젝트에서 사용자나 AI가 읽고 실행할 작업 가이드입니다.

이미 `openapi/config/project.jsonc`가 있으면 `init`은 중단됩니다. 기존 bootstrap을 템플릿 기준으로 다시 만들 때만 명시적으로 실행합니다.

```bash
openapi-projector init --force
```

`--force`는 `openapi/config/project.jsonc`, `openapi/config/project-rules.jsonc`, `openapi/README.md`, `openapi/.gitignore`를 다시 씁니다.

`openapi/.gitignore`는 재생성 가능한 산출물을 기본으로 제외합니다.

- ignore: `openapi/_internal/`, `openapi/review/`, `openapi/project/`
- commit 권장: `openapi/README.md`, `openapi/config/project.jsonc`, `openapi/config/project-rules.jsonc`, `openapi/.gitignore`

### 2. OpenAPI URL 설정

`openapi/config/project.jsonc`의 `sourceUrl`을 실제 OpenAPI JSON URL로 바꿉니다.

```jsonc
{
  "sourceUrl": "<openapi-json-url>"
}
```

`sourceUrl`은 Swagger UI 주소가 아니라 OpenAPI JSON 요청 URL이어야 합니다.

### 3. 점검

```bash
openapi-projector doctor
```

OpenAPI URL 접근까지 확인하려면:

```bash
openapi-projector doctor --check-url
```

### 4. 단계별 생성

```bash
openapi-projector refresh
openapi-projector rules
# openapi/review/project-rules/analysis.md 확인
# openapi/config/project-rules.jsonc 수정
openapi-projector project
```

`rules` 이후에는 AI나 사람이 `openapi/review/project-rules/analysis.md`를 읽고, `openapi/config/project-rules.jsonc`의 `fetchApiImportPath`, `fetchApiSymbol`, `adapterStyle`을 현재 프로젝트에 맞게 확인/수정합니다.

빠르게 전체를 다시 만들 때는 아래 shortcut을 사용할 수 있습니다.

```bash
openapi-projector prepare
```

`prepare`는 필요한 경우 `init`을 먼저 실행하고, 이후 `refresh -> rules -> project`를 이어서 실행합니다.

결과 확인 위치:

- `openapi/config/project-rules.jsonc`
- `openapi/project/src/openapi-generated`
- `openapi/project/summary.md`

## 자주 쓰는 명령

| 명령 | 역할 |
| --- | --- |
| `openapi-projector init` | 현재 프로젝트에 기본 설정 생성 |
| `openapi-projector doctor` | 로컬 설정과 프로젝트 준비 상태 점검 |
| `openapi-projector prepare` | 후보 코드까지 한 번에 생성 |
| `openapi-projector refresh` | OpenAPI 다운로드 + review 산출물 생성 |
| `openapi-projector rules` | 프로젝트 규칙 분석/스캐폴드 생성 |
| `openapi-projector project` | DTO/API 후보 코드 생성 |

package script로 감싸도 됩니다.

```json
{
  "scripts": {
    "openapi:doctor": "openapi-projector doctor",
    "openapi:prepare": "openapi-projector prepare"
  }
}
```

## 실행 기준

- 기본 대상 프로젝트는 현재 실행 디렉터리입니다.
- target project root 우선순위:
  1. `--project-root /path/to/service-app`
  2. `.openapi-projector.local.jsonc`
  3. `.openapi-tool.local.jsonc` legacy fallback
  4. 현재 실행 디렉터리

## 생성되는 주요 산출물

```text
openapi/
  README.md
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

실제 앱 코드 반영은 자동으로 하지 않습니다. `openapi/project/` 아래 후보 코드를 사람이거나 AI가 검토한 뒤 실제 앱 코드 위치로 반영합니다. `openapi/project/` 자체는 기본적으로 Git에서 제외됩니다.

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

사용자 문서:

- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)

관리/기획 문서:

- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
- 제품 방향: [docs/05-product-plan.md](docs/05-product-plan.md)
- 요구사항: [docs/06-requirements-spec.md](docs/06-requirements-spec.md)
- 갭 분석: [docs/07-gap-analysis.md](docs/07-gap-analysis.md)
