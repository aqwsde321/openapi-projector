# openapi-projector

OpenAPI JSON을 프론트엔드 프로젝트 컨벤션에 맞는 DTO/API 후보 코드로 변환하는 review-first CLI입니다.

`openapi-projector`는 OpenAPI 스펙을 앱 `src/`에 바로 생성하지 않습니다. 대상 프론트엔드 프로젝트 안에 `openapi/` 작업 공간을 만들고, 사람이나 AI coding agent가 필요한 endpoint만 실제 앱 코드로 옮기도록 돕습니다.

> 스펙은 자동으로, 프로젝트 컨벤션은 명시적으로, 실제 반영은 검토 후에.

## 1. 도구 받기

이 저장소를 clone 하거나 다운로드한 뒤 설치합니다.

```bash
git clone <repository-url> openapi-projector
cd /path/to/openapi-projector
pnpm install
pnpm link --global
```

전역 링크를 쓰지 않으면 `node /path/to/openapi-projector/bin/openapi-tool.mjs <command>`로 실행해도 됩니다.

## 2. 프론트엔드 프로젝트에 적용

프론트엔드 프로젝트 루트에서 한 번만 실행합니다.

```bash
cd /path/to/frontend-project
openapi-projector init
```

OpenAPI JSON URL을 이미 알고 있으면 init 단계에서 바로 넣을 수 있습니다.

```bash
openapi-projector init --source-url https://example.com/v3/api-docs
```

`init` 후에는 프론트엔드 프로젝트에 `openapi/README.md`, `openapi/config/project.jsonc`, `openapi/config/project-rules.jsonc`가 생성됩니다.

## 3. AI에게 붙여넣기

이후 해당 프론트엔드 프로젝트에서 사용하는 AI coding agent에게 아래 프롬프트를 그대로 붙여넣습니다.

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

먼저 openapi/README.md를 읽고 그 지침대로 진행해.
openapi/config/project.jsonc의 sourceUrl이 Swagger UI 페이지가 아니라 OpenAPI JSON 요청 URL인지 확인해.
sourceUrl이 비어 있거나 잘못되어 있으면 나에게 올바른 OpenAPI JSON URL을 물어봐.

openapi-projector doctor --check-url을 실행해서 설정과 URL 접근 가능 여부를 확인해.
그 다음 openapi-projector refresh와 openapi-projector rules를 실행해.

openapi/review/project-rules/analysis.md와 analysis.json을 읽고,
실제 프로젝트의 API client, import 경로, request 호출 방식을 직접 확인한 뒤
openapi/config/project-rules.jsonc를 이 프로젝트 컨벤션에 맞게 수정해.

규칙이 맞다고 판단되면 openapi/config/project-rules.jsonc의 review.rulesReviewed를 true로 바꾸고,
openapi-projector project를 실행해서 DTO/API 후보 코드를 생성해.

생성된 openapi/project 코드는 최종 앱 코드가 아니라 검토용 후보야.
내가 요청한 endpoint나 기능에 필요한 DTO/API만 실제 앱 코드 위치로 옮기거나 맞게 수정해.
openapi/review와 openapi/project는 재생성 가능한 산출물이므로 커밋하지 마.

실제 앱 코드에 반영한 뒤, 이 프로젝트에서 사용 중이면 타입체크, 린트, 관련 테스트를 실행해줘.

내가 필요한 endpoint/기능:
- <여기에 필요한 endpoint나 기능을 적어줘>
```

DTO만 필요하면 마지막 요청을 이렇게 바꿔서 붙여넣으면 됩니다.

```text
내가 필요한 endpoint/기능:
- <여기에 필요한 endpoint나 기능을 적어줘>

API wrapper는 반영하지 말고, 요청한 endpoint의 .dto.ts 후보만 실제 앱 코드 구조에 맞게 옮겨줘.
```

## 생성 흐름

```text
OpenAPI JSON
    ↓ refresh
review docs / schema / change summary
    ↓ rules
project API client 분석 + rules 생성
    ↓ project
DTO/API 후보 코드 생성
    ↓
사람 또는 AI가 필요한 파일만 실제 src/로 반영
```

## 문서

- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
- 제품 방향: [docs/05-product-plan.md](docs/05-product-plan.md)
- 요구사항과 지원 범위: [docs/06-requirements-spec.md](docs/06-requirements-spec.md)
- 갭 분석: [docs/07-gap-analysis.md](docs/07-gap-analysis.md)
