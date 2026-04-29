# openapi-projector

OpenAPI JSON을 프론트엔드 프로젝트 컨벤션에 맞는 DTO/API 후보 코드로 변환하는 review-first CLI입니다.

앱 `src/`에 바로 생성하지 않고, 프론트엔드 프로젝트 안의 `openapi/` 작업 공간에 검토용 후보를 만든 뒤 필요한 코드만 실제 앱에 반영합니다.

## 빠른 시작

### 1. 도구 설치

Node.js와 `pnpm`이 필요합니다. `pnpm` 명령이 없다면 먼저 설치하세요.

```bash
npm install -g pnpm@10.28.2
```

이 저장소를 clone 하거나 다운로드한 뒤 설치합니다.

```bash
git clone <repository-url> openapi-projector
cd openapi-projector
pnpm install
pnpm link --global
```

### 2. 프론트엔드 프로젝트에 적용

프론트엔드 프로젝트 루트에서 한 번만 실행합니다.

```bash
cd <프론트엔드 프로젝트 루트>
openapi-projector init
```

OpenAPI JSON URL을 알고 있으면 바로 넣을 수 있습니다.

```bash
openapi-projector init --source-url https://example.com/v3/api-docs
```

### 3. AI에게 맡기기

프론트엔드 프로젝트에서 사용하는 AI coding agent에게 아래처럼 요청합니다.

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

1. 먼저 openapi/README.md를 읽어.
2. openapi/config/project.jsonc의 sourceUrl이 Swagger UI 페이지가 아니라 OpenAPI JSON URL인지 확인해.
   sourceUrl이 비어 있거나 잘못되어 있으면 나에게 올바른 OpenAPI JSON URL을 물어봐.
3. openapi-projector doctor --check-url을 실행해.
4. openapi-projector refresh를 실행하고 openapi/review/changes/summary.md를 확인해.
5. openapi-projector rules를 실행해.
6. openapi/review/project-rules/analysis.md와 analysis.json을 읽고,
   실제 프로젝트의 API client, import 경로, request 호출 방식을 확인해.
7. openapi/config/project-rules.jsonc를 프로젝트 컨벤션에 맞게 수정하고,
   규칙이 맞다고 판단되면 review.rulesReviewed를 true로 바꿔.
8. openapi-projector project를 실행해.
9. openapi/project/summary.md를 읽고 생성된 endpoint와 skipped endpoint를 요약해.

아직 실제 앱 코드에는 반영하지 말고, 내가 어떤 endpoint를 적용할지 아래 형식으로 물어봐.

적용할 endpoint:
- <METHOD> <PATH> 또는 operationId

반영 범위:
- DTO만
- DTO + API wrapper

사용할 실제 앱 코드 위치:
- <예: src/features/user/api>
```

DTO만 필요하면 아래 문장을 추가하세요.

```text
API wrapper는 반영하지 말고, 요청한 endpoint의 .dto.ts 후보만 실제 앱 코드 구조에 맞게 옮겨줘.
```

## 알아둘 점

- `sourceUrl`은 Swagger UI 페이지가 아니라 OpenAPI JSON URL이어야 합니다.
- `openapi-projector refresh` 후 최신 변경 요약은 `openapi/review/changes/summary.md`에서 확인합니다.
- 변경 이력은 `openapi/review/changes/history/`에 `.md`와 `.json`으로 누적됩니다.
- `Contract Changed` 항목에는 request/response/schema/parameter의 필드 단위 변경 내용이 비교 표로 표시됩니다.
- `openapi/project/`는 최종 앱 코드가 아니라 검토용 후보입니다.
- `openapi/review/`와 `openapi/project/`는 보통 커밋하지 않습니다.
- 자세한 작업 지침은 init 후 생성되는 `openapi/README.md`에 들어 있습니다.

## 문서

- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
