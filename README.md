# openapi-projector

OpenAPI JSON을 프론트엔드 프로젝트 컨벤션에 맞는 DTO/API 후보 코드로 변환하는 review-first CLI입니다.

앱 `src/`에 바로 생성하지 않고, 프론트엔드 프로젝트 안의 `openapi/` 작업 공간에 검토용 후보를 만든 뒤 필요한 코드만 실제 앱에 반영합니다.

## 빠른 시작

프론트엔드 프로젝트 루트에서 실행합니다.

```bash
npx --yes openapi-projector init
```

`init`은 기본 OpenAPI JSON URL을 보여주고, 터미널에서 실행 중이면 바꿀 URL을 입력할 수 있게 물어봅니다. Enter를 누르면 기본값 `http://localhost:8080/v3/api-docs`를 그대로 사용합니다. 입력한 URL이 실패하면 같은 서버의 대표 OpenAPI JSON 경로를 자동으로 확인하고, 그래도 실패하면 다시 입력하게 합니다. 백엔드가 아직 떠 있지 않거나 VPN/인증 때문에 CLI에서 접근할 수 없으면 `skip`을 입력해 마지막 URL을 그대로 저장할 수 있습니다.

`init` 완료 로그에는 나중에 수정할 `openapi/config/project.jsonc` 경로와 `file://` 링크가 함께 표시됩니다. 이미 `init`을 실행했다면 그 파일의 `sourceUrl`을 수정하면 됩니다.

<details>
<summary>CI/스크립트에서 프롬프트 없이 실행하기</summary>

```bash
npx --yes openapi-projector init --source-url "http://localhost:8080/v3/api-docs"
```

</details>

생성되는 핵심 파일:

| 파일 | 용도 |
| --- | --- |
| `openapi/README.md` | 사람용 요약과 AI agent용 상세 지침 |
| `openapi/config/project.jsonc` | OpenAPI JSON URL과 산출물 경로 설정 |
| `openapi/config/project-rules.jsonc` | 프로젝트 API client/import/call style 규칙 |

AI에게 맡기기 전에 사람이 검토 자료를 먼저 만들고 싶다면 아래 명령을 실행할 수 있습니다.

```bash
npx --yes openapi-projector prepare
```

`prepare`는 아래 명령을 순서대로 대신 실행하는 단축 명령입니다.

1. `refresh`: OpenAPI JSON을 내려받고 review 문서를 만듭니다.
2. `rules`: 현재 프론트엔드 프로젝트의 API 호출 방식을 분석하고 `openapi/config/project-rules.jsonc` 초안을 만듭니다.
3. `project`: 검토된 규칙으로 DTO/API 후보 코드를 만듭니다.

첫 실행에서는 `rules` 검토 단계에서 멈추는 것이 정상입니다. 이때 `openapi/review/changes/summary.md`, `openapi/review/project-rules/analysis.md`, `openapi/config/project-rules.jsonc`를 확인합니다.

**중요:** 규칙이 실제 프로젝트와 맞다고 확인한 뒤에만 `openapi/config/project-rules.jsonc`의 `review.rulesReviewed`를 `true`로 바꾸고 다시 `prepare`를 실행합니다.

```jsonc
{
  "review": {
    "rulesReviewed": true
  }
}
```

## AI에게 붙여넣기

프론트엔드 프로젝트에서 사용하는 AI coding agent에게 아래처럼 요청하세요.

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

1. 먼저 openapi/README.md를 읽어.
2. openapi/config/project.jsonc의 sourceUrl이 Swagger UI 페이지가 아니라 OpenAPI JSON URL인지 확인해.
   sourceUrl이 비어 있거나 잘못되어 있으면 나에게 올바른 OpenAPI JSON URL을 물어봐.
3. npx --yes openapi-projector doctor --check-url을 실행해.
4. npx --yes openapi-projector refresh를 실행하고 openapi/review/changes/summary.md를 확인해.
5. npx --yes openapi-projector rules를 실행해.
6. openapi/review/project-rules/analysis.md와 analysis.json을 읽고,
   실제 프로젝트의 API client, import 경로, request 호출 방식을 확인해.
7. rules가 만든 openapi/config/project-rules.jsonc 초안이 프로젝트 컨벤션과 맞는지 확인해.
   맞지 않는 부분이 있으면 수정하고, 맞다고 판단되면 review.rulesReviewed를 true로 바꿔.
8. npx --yes openapi-projector project를 실행해.
9. openapi/project/summary.md를 읽고 생성된 endpoint와 skipped endpoint를 요약해.

아직 실제 앱 코드에는 반영하지 말고, 내가 어떤 endpoint를 적용할지 아래 형식으로 물어봐.

적용할 endpoint:
- <METHOD> <PATH> 또는 operationId

반영 범위:
- DTO만
- DTO + API wrapper

사용할 실제 앱 코드 위치:
- <예: src/features/user/api>

내가 endpoint를 정하면 openapi/project/의 후보 코드를 프로젝트 컨벤션에 맞게 실제 앱 코드에 반영해.
프로젝트에서 typecheck, lint, 관련 테스트를 사용 중이면 반영 후 실행해.
```

API wrapper까지 필요하면 위 프롬프트 그대로 쓰면 됩니다. DTO만 필요하면 아래 문장을 추가하세요.

```text
API wrapper는 반영하지 말고, 요청한 endpoint의 .dto.ts 후보만 실제 앱 코드 구조에 맞게 옮겨줘.
```

## 알아둘 점

- `sourceUrl`은 Swagger UI 페이지가 아니라 OpenAPI JSON URL이어야 합니다.
- `refresh` 후 최신 변경 요약은 `openapi/review/changes/summary.md`에서 확인합니다.
- `Contract Changed` 항목에는 request body, response body, parameter 중심의 필드 단위 변경 내용이 표시됩니다.
- `openapi/project/`는 최종 앱 코드가 아니라 검토용 후보입니다.
- `openapi/review/`와 `openapi/project/`는 보통 커밋하지 않습니다.
- 자세한 작업 지침은 init 후 생성되는 `openapi/README.md`에 들어 있습니다.
- npm 배포 버전이 아니라 현재 저장소 코드를 직접 실행하려면 [도구 개발/유지보수](docs/03-maintainer-notes.md)를 참고하세요.

## 문서

- 변경 이력: [CHANGELOG.md](CHANGELOG.md)
- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
