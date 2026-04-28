# openapi-projector

OpenAPI JSON에서 프론트엔드 프로젝트용 DTO/API 후보 코드를 만들어 주는 standalone CLI입니다.

## 왜 만들었나

백엔드 OpenAPI 스펙은 프론트엔드 타입과 API 함수의 좋은 출발점이지만, 생성 코드를 곧바로 `src/`에 넣으면 프로젝트의 HTTP client, 폴더 구조, 네이밍, 에러 처리 방식과 어긋나기 쉽습니다.

`openapi-projector`는 생성물을 바로 앱 코드에 쓰기보다, 프론트엔드 프로젝트 안에 `openapi/` 작업 공간을 만들고 그 안에서 검토 가능한 후보 코드를 생성합니다. 이후 사람이나 AI가 기존 프로젝트 컨벤션에 맞춰 필요한 DTO/API만 실제 앱 코드로 옮기는 흐름을 전제로 합니다.

## 어떤 용도인가

- OpenAPI JSON을 기준으로 프론트엔드 DTO/API 후보 코드 생성
- OpenAPI 변경점과 endpoint 문서를 `openapi/review/`에 정리
- 현재 프론트엔드 프로젝트의 API client 사용 방식을 분석해 `analysis.md` / `analysis.json` / `project-rules.jsonc` 생성
- 생성 후보를 `openapi/project/`에 격리해서 실제 앱 코드 반영 전 검토
- AI coding agent가 `openapi/README.md`를 읽고 안전하게 후속 작업을 진행하도록 handoff

## 1. 도구 준비

```bash
cd /path/to/openapi-projector
pnpm install
pnpm link --global
```

별도 빌드 단계는 없습니다. 전역 링크를 쓰지 않으면 프론트엔드 프로젝트에서 `node /path/to/openapi-projector/bin/openapi-tool.mjs <command>`로 실행해도 됩니다.

## 2. 프론트엔드 프로젝트에서 init

프론트엔드 프로젝트 루트에서 한 번만 실행합니다.

```bash
cd /path/to/frontend-project
openapi-projector init
```

OpenAPI JSON URL을 이미 알고 있으면 init 단계에서 바로 넣을 수 있습니다.

```bash
openapi-projector init --source-url https://example.com/v3/api-docs
```

`sourceUrl`은 Swagger UI 페이지가 아니라 OpenAPI JSON 요청 URL이어야 합니다. 현재는 로컬에서 인증 없이 `GET` 가능한 JSON URL을 기준으로 합니다.

`init`이 생성하는 주요 파일:

- `.openapi-projector.local.jsonc`
- `openapi/README.md`
- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

## 3. 사람이 꼭 이해할 것

init 이후의 자세한 명령 순서는 사람이 외울 필요가 없습니다. `openapi/README.md`가 프로젝트별 상세 사용법 문서이고, AI coding agent가 그 파일을 읽고 진행하도록 설계했습니다.

사람이 알아야 하는 핵심은 아래 정도입니다.

- `sourceUrl`은 Swagger UI 페이지가 아니라 OpenAPI JSON 요청 URL입니다.
- 생성되는 `openapi/project/` 코드는 최종 앱 코드가 아니라 검토용 후보입니다.
- 실제 앱 코드에는 필요한 DTO/API만 프로젝트 컨벤션에 맞게 옮깁니다.
- `openapi/review/`와 `openapi/project/`는 재생성 가능한 산출물이므로 보통 커밋하지 않습니다.
- 보통 커밋하는 파일은 `openapi/README.md`, `openapi/config/project.jsonc`, `openapi/config/project-rules.jsonc`, `openapi/.gitignore`입니다.

## 4. AI에게 붙여넣기

사람은 init까지만 실행한 뒤, AI coding agent에게 아래 프롬프트를 그대로 복사해서 붙여넣으면 됩니다.

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

먼저 openapi/README.md를 읽고 그 지침대로 진행해.
openapi/config/project.jsonc의 sourceUrl을 확인하고, openapi-projector doctor --check-url을 실행해.
그 다음 openapi-projector refresh와 openapi-projector rules를 실행해서 기존 API client 사용 방식을 분석하고 openapi/config/project-rules.jsonc를 프로젝트에 맞게 수정해.
이후 openapi-projector project를 실행해서 DTO/API 후보를 생성해.

생성된 후보는 바로 커밋하지 말고, 내가 요청한 endpoint의 DTO/API만 실제 앱 코드 위치로 옮기거나 맞게 수정해.
openapi/review와 openapi/project는 재생성 가능한 산출물이므로 커밋하지 마.
실제 앱 코드에 반영한 뒤 타입체크, 린트, 관련 테스트를 실행해줘.
```

DTO만 필요하면 마지막 요청을 이렇게 바꿔서 붙여넣으면 됩니다.

```text
API wrapper는 반영하지 말고, 내가 요청한 endpoint의 .dto.ts 후보만 실제 앱 코드 구조에 맞게 옮겨줘.
```

## 범위

지원:

- OpenAPI 3.0 JSON 및 OpenAPI 3.1 JSON 일부
- OpenAPI 3.1 `type: ["...", "null"]` 형태의 nullable 타입
- React/Next + TypeScript 프로젝트 대상 후보 코드
- 대상 프로젝트의 기존 HTTP client를 사용하는 wrapper 생성
- 태그 폴더형 또는 flat endpoint 파일 배치
- 명시적 `2xx`/`2XX` 성공 응답이 있는 endpoint 생성
- 생성 API wrapper의 path parameter URL encoding
- JSONC 설정 파일의 주석과 trailing comma

아직 범위 밖:

- OpenAPI 2.0
- YAML
- 명시적 성공 응답 없이 `default`/`4xx` 응답만 있는 endpoint 자동 생성
- Vue
- React Query hooks
- Ajv/Zod 런타임 검증

## 문서

- init 후 상세 사용법: 프론트엔드 프로젝트에 생성되는 `openapi/README.md`
- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
- 제품 방향: [docs/05-product-plan.md](docs/05-product-plan.md)
- 요구사항: [docs/06-requirements-spec.md](docs/06-requirements-spec.md)
- 갭 분석: [docs/07-gap-analysis.md](docs/07-gap-analysis.md)
