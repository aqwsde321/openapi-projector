# openapi-projector

[![npm version](https://img.shields.io/npm/v/openapi-projector?label=npm)](https://www.npmjs.com/package/openapi-projector)
[![Publish](https://github.com/aqwsde321/openapi-projector/actions/workflows/publish.yml/badge.svg)](https://github.com/aqwsde321/openapi-projector/actions/workflows/publish.yml)

`openapi-projector`는 Swagger/OpenAPI 변경점을 먼저 검토하고, TypeScript DTO/API/React Query hook 후보를 프로젝트 컨벤션에 맞춰 별도 작업 공간에 생성하는 review-first CLI입니다.

앱 `src/`를 바로 수정하지 않고, 프론트엔드 프로젝트의 `openapi/` 작업 공간에 변경 비교, 분석 결과, 후보 코드를 쌓습니다. 이후 개발자나 AI agent가 필요한 endpoint만 골라 반영합니다.

`openapi-projector`의 중심은 코드 생성보다 Swagger 변경 검토와 안전한 반영 준비입니다.

## 시작 방법 선택

- [AI agent로 시작하기](#ai-agent로-사용하기): Codex 스킬 또는 다른 AI agent용 프롬프트를 복사해서 사용합니다.
- [직접 설치해서 시작하기](#빠른-시작): 프론트엔드 프로젝트에서 `init`, `prepare`, rules 검토를 직접 실행합니다.
- [기존 작업 공간 업데이트](#기존-작업-공간-업데이트): 이미 `openapi/`가 있는 프로젝트의 안내와 기본값만 갱신합니다.

## 목차

1. [AI agent로 사용하기](#ai-agent로-사용하기) - Codex / 일반 AI agent용 프롬프트
2. [빠른 시작](#빠른-시작) - 직접 설치와 `prepare` 흐름
3. [한눈에 보기](#한눈에-보기) - 전체 작업 순서
4. [핵심 기능](#핵심-기능) - 지원 기능 요약
5. [지원 범위](#지원-범위) - 입력 형식과 의도한 사용 범위
6. [문서](#문서) - 상세 문서 링크
7. [기여자](#기여자) - 프로젝트 기여자

## 한눈에 보기

```text
init -> prepare -> review rules -> prepare -> apply selected endpoints
```

| 단계 | 명령/작업 | 하는 일 |
| --- | --- | --- |
| 1 | `npx --yes openapi-projector@latest init` | 프론트엔드 프로젝트에 `openapi/` 작업 공간 생성 |
| 2 | `npx --yes openapi-projector@latest prepare` | Swagger 변경 비교와 프로젝트 규칙 분석 |
| 3 | rules 검토 | API client, import 경로, request call style 확인 후 `review.rulesReviewed=true` 설정 |
| 4 | `npx --yes openapi-projector@latest prepare` | 검토된 규칙으로 DTO/API/hook 후보 생성 |
| 5 | endpoint 선택 반영 | 필요한 후보만 실제 앱 코드에 적용 |

첫 `prepare`는 rules 검토 단계에서 멈춥니다. 이 단계 때문에 프로젝트 컨벤션을 확인하기 전에는 후보 코드가 생성되지 않습니다.

## 핵심 기능

| 기능 | 역할 |
| --- | --- |
| Swagger 변경 비교 | `openapi/changes.md`에서 endpoint 추가/삭제, 계약 변경, 문서성 변경을 먼저 확인합니다. |
| Review-first 작업 공간 | `openapi/review/`, `openapi/project/`에 재생성 가능한 산출물을 만들고 실제 앱 코드는 건드리지 않습니다. |
| 프로젝트 규칙 분석 | 기존 API client import, request call style, React Query 사용 여부를 분석해 `project-rules.jsonc` 초안을 만듭니다. |
| Endpoint별 후보 생성 | 필요한 endpoint의 `.dto.ts`, `.api.ts`, 선택적 `.query.ts`/`.mutation.ts` 후보를 생성합니다. |
| 선택적 Slack 알림 | 백엔드 CI에서 배포된 OpenAPI를 이전 기준선과 비교하고 변경 리포트를 Slack으로 공지할 수 있습니다. |
| 개발자/AI 협업 산출물 | `analysis.md`, `analysis.json`, `summary.md`로 검토와 후속 반영을 나눠 진행할 수 있습니다. |

## 지원 범위

- OpenAPI 3.0/3.1 JSON 입력을 지원합니다.
- Node.js 18 이상이 필요합니다.
- TypeScript 프론트엔드 프로젝트의 기존 API client를 사용하는 후보 코드를 만듭니다.
- YAML, OpenAPI 2.0, 모든 프레임워크 컨벤션을 자동으로 맞추는 범용 codegen은 목표가 아닙니다.
- 앱 코드 반영은 `openapi/project/` 후보를 검토한 뒤 별도로 진행합니다.

## AI agent로 사용하기

AI agent에게 맡길 때는 사용하는 에이전트에 따라 아래 둘 중 하나를 그대로 붙여넣습니다. 사람이 직접 진행할 때는 [빠른 시작](#빠른-시작)으로 이동하면 됩니다.

### Codex agent용 프롬프트

Codex를 사용한다면 아래 프롬프트를 그대로 붙여넣습니다. Codex agent가 `openapi-projector` 스킬을 사용할 수 있으면 스킬로 진행하고, 아직 설치되어 있지 않으면 먼저 설치 여부를 물어봅니다.

```text
이 프론트엔드 프로젝트에 openapi-projector Codex 스킬을 사용해줘.

1. 먼저 현재 작업 위치가 프론트엔드 프로젝트 루트 경로인지 확인해.
   프론트엔드 프로젝트 루트 경로는 package.json이 있는 앱 프로젝트 루트야.
2. `$openapi-projector` 스킬을 사용할 수 있는지 확인해.
   사용할 수 없다면 나에게 설치할지 먼저 물어보고, 내가 동의하면 프론트엔드 프로젝트 루트에서 `npx --yes openapi-projector@latest install-skill --yes`를 실행해.
   이 명령은 Codex 스킬만 설치하고, 프로젝트의 openapi/ 작업공간은 만들지 않아.
   스킬이나 openapi/ 작업공간 업데이트가 필요하다는 안내가 나오면 자동으로 덮어쓰지 말고, 어떤 파일/스킬이 갱신되는지 설명한 뒤 나에게 먼저 물어봐.
3. openapi/README.md가 있으면 먼저 읽어.
   없으면 프론트엔드 프로젝트 루트에서 `npx --yes openapi-projector@latest init`을 실행한 뒤 생성된 openapi/README.md를 읽어.
4. `$openapi-projector prepare` 흐름으로 Swagger 변경 비교, rules 확인, 후보 생성을 진행해.
5. rules는 실제 프로젝트의 API client, import 경로, request 호출 방식, response wrapper, React Query 사용 근거로 확인하고, 맞지 않으면 project-rules.jsonc를 최소 수정해.
6. prepare 결과는 내부 근거로 확인하고, 사용자에게는 실제 앱 반영에 영향을 줄 수 있는 중요 변경이나 리스크만 짧게 알려줘.
7. 내가 endpoint를 아직 지정하지 않았다면 적용할 endpoint를 `<METHOD> <PATH>` 또는 operationId 형식으로 물어봐.

내가 endpoint를 지정하면 `$openapi-projector <METHOD> <PATH> 적용` 흐름으로 실제 프로젝트 컨벤션에 맞게 반영해.
내가 처음 요청에 endpoint를 이미 같이 적었다면 다시 묻지 말고 그 endpoint를 바로 적용해.
기본 반영 범위는 선택한 endpoint의 DTO + API wrapper야.
React Query hook은 프로젝트가 이미 hook 패턴을 쓰고 project-rules.jsonc에서 hook 생성이 켜져 있을 때만 함께 반영해.
```

endpoint를 바로 지정할 때는 짧게 요청하면 됩니다.

```text
$openapi-projector POST /login 적용
$openapi-projector 룰 새로 적용하고 POST /login 적용
```

### Codex 스킬 없이 또는 다른 AI agent용 프롬프트

Codex 스킬을 쓰지 않거나 다른 AI coding agent를 쓴다면 아래 프롬프트를 붙여넣습니다.

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

1. 먼저 현재 작업 위치가 프론트엔드 프로젝트 루트 경로인지 확인해.
   프론트엔드 프로젝트 루트 경로는 package.json이 있는 앱 프로젝트 루트야.
2. 프론트엔드 프로젝트 루트 경로에 openapi/README.md가 있으면 먼저 읽어.
   없으면 그 루트 경로에서 npx --yes openapi-projector@latest init을 실행한 뒤 생성된 openapi/README.md를 읽어.
3. 이후 명령은 모두 프론트엔드 프로젝트 루트 경로에서 실행해.
4. npx --yes openapi-projector@latest prepare가 이미 실행되어 있다면 openapi/changes.md를 가장 먼저 확인해.
   최신 여부가 불확실하면 아래 명령을 다시 실행해.
5. openapi/config/project.jsonc의 sourceUrl이 Swagger UI 페이지가 아니라 OpenAPI JSON URL인지 확인해.
   sourceUrl이 비어 있거나 잘못되어 있으면 나에게 올바른 OpenAPI JSON URL을 물어봐.
   산출물 경로 필드는 도구가 관리하므로 임의로 바꾸지 마. 코드 스타일과 API client 규칙은 project-rules.jsonc에서만 검토해.
6. npx --yes openapi-projector@latest doctor --check-url을 실행해.
7. npx --yes openapi-projector@latest prepare를 실행하고 openapi/changes.md를 확인해.
   Added, Removed, Contract Changed, Doc Changed를 endpoint별로 먼저 요약해서 나에게 알려줘.
8. prepare가 rules 검토 단계에서 멈췄다면 openapi/review/project-rules/analysis.md와 analysis.json을 읽고,
   실제 프로젝트의 API client, import 경로, request 호출 방식을 확인해.
9. rules가 만든 openapi/config/project-rules.jsonc 초안이 프로젝트 컨벤션과 맞는지 확인해.
   React Query를 쓰는 프로젝트라면 hooks.enabled가 true로 자동 제안됐는지도 확인해.
   필요하면 수정하고, 확인되면 review.rulesReviewed를 true로 바꿔.
10. 명령 실행 중 update, upgrade-docs, install-skill --force 같은 업데이트 안내가 나오면 자동으로 덮어쓰지 말고 어떤 파일/스킬이 갱신되는지 설명한 뒤 나에게 먼저 물어봐.
11. review.rulesReviewed를 true로 바꾼 뒤 npx --yes openapi-projector@latest prepare를 다시 실행해.
12. openapi/project/summary.md를 읽고 생성된 endpoint와 skipped endpoint를 요약해.
13. openapi/project/summary.md의 Application Review 섹션에서 runtime wrapper, endpoint별 request/response DTO, params, body, media type을 확인해.
14. 실제 앱 코드 반영 전에는 openapi/review/project-rules/analysis.md와 analysis.json의 근거를 다시 확인해.
    generated .api.ts를 그대로 복사하지 말고 기존 프로젝트의 URL constant, Response wrapper, 기존 DTO, export style, error handling, query/cache 규칙에 맞게 조정할 부분을 먼저 정리해.

아직 실제 앱 코드에는 반영하지 말고, Swagger 변경 비교 요약과 DTO/API/hook 후보 요약을 나눈 뒤 내가 어떤 endpoint를 적용할지 아래 형식으로 물어봐.

적용할 endpoint:
- <METHOD> <PATH> 또는 operationId

반영 범위:
- DTO만
- DTO + API wrapper
- DTO + API wrapper + React Query hook

사용할 실제 앱 코드 위치:
- <예: src/features/user/api>

내가 endpoint를 정하면 Application Review와 rules 분석 근거를 다시 확인한 뒤 openapi/project/의 후보 코드를 프로젝트 컨벤션에 맞게 실제 앱 코드에 반영해.
프로젝트에서 typecheck, lint, 관련 테스트를 사용 중이면 반영 후 실행해.
```

DTO만 필요하면 프롬프트 마지막에 `API wrapper는 반영하지 말고, 요청한 endpoint의 .dto.ts 후보만 실제 앱 코드 구조에 맞게 옮겨줘.`를 추가합니다.

## 빠른 시작

프론트엔드 프로젝트 루트에서 실행합니다.

```bash
npx --yes openapi-projector@latest init
```

`init`은 `openapi/` 작업 공간을 만들고 OpenAPI JSON URL을 묻습니다.

```text
OpenAPI JSON URL [http://localhost:8080/v3/api-docs]:
```

Enter를 누르면 기본값을 사용합니다. 다른 주소가 있으면 OpenAPI JSON URL을 붙여넣습니다. Swagger UI 페이지 URL을 넣어도 같은 서버의 대표 JSON 경로를 자동으로 찾아봅니다. 백엔드에 접근할 수 없으면 `skip`을 입력하고 나중에 `openapi/config/project.jsonc`의 `sourceUrl`을 수정할 수 있습니다.

다음으로 준비 흐름을 실행합니다.

```bash
npx --yes openapi-projector@latest prepare
```

첫 실행은 `rules` 검토 단계에서 멈춥니다.

1. `openapi/changes.md`에서 Swagger 변경점을 확인합니다.
2. `openapi/review/project-rules/analysis.md`와 `analysis.json`에서 프로젝트 분석 근거를 확인합니다.
3. `openapi/config/project-rules.jsonc`가 실제 API client/import/call style과 맞는지 검토합니다.
4. 맞으면 `review.rulesReviewed`를 `true`로 바꾸고 `prepare`를 다시 실행합니다.

```jsonc
{
  "review": {
    "rulesReviewed": true
  }
}
```

검토 후 다시 실행하면 `openapi/project/summary.md`와 `openapi/project/src/openapi-generated/` 아래 DTO/API/hook 후보가 생성됩니다.

### 기존 작업 공간 업데이트

이미 `openapi/` 작업 공간이 있는 프로젝트에서 최신 CLI 안내와 규칙 기본값만 갱신하려면 `init --force` 대신 `update`를 사용합니다.

```bash
npx --yes openapi-projector@latest update
```

`update`는 `openapi/config/project.jsonc`, review history, generated candidates를 보존하고 `openapi/README.md`, 로컬 설정, `project-rules.jsonc`의 안전한 기본값만 갱신합니다.

<details>
<summary>자세한 실행 흐름</summary>

`prepare`는 아래 흐름을 한 번에 실행합니다.

```text
refresh -> rules -> review gate -> project
```

- `refresh`: Swagger/OpenAPI를 내려받고 이전 endpoint catalog와 비교해 `openapi/changes.md`를 만듭니다.
- `rules`: 현재 프론트엔드 프로젝트의 API 호출 규칙과 React Query 사용 여부를 분석해 `openapi/config/project-rules.jsonc`를 만듭니다.
- `review gate`: `review.rulesReviewed=true`가 아니면 후보 생성을 멈춥니다.
- `project`: 검토된 규칙으로 DTO/API 후보와 선택적 React Query hook 후보를 생성합니다.

단계를 나눠 실행하려면 아래 명령을 사용합니다.

```bash
npx --yes openapi-projector@latest doctor --check-url
npx --yes openapi-projector@latest refresh
npx --yes openapi-projector@latest rules
# openapi/config/project-rules.jsonc 검토 후 review.rulesReviewed=true 설정
npx --yes openapi-projector@latest project
```

</details>

<details>
<summary>Swagger 변경 비교</summary>

먼저 확인할 산출물은 `openapi/changes.md`입니다. DTO/API 후보 생성이 필요 없고 Swagger 변경점만 확인할 때는 `refresh`를 단독으로 실행합니다.

```bash
npx --yes openapi-projector@latest refresh
```

최신 비교 결과는 `openapi/changes.md`와 `openapi/changes.json`에 기록되고, 변경이 있으면 시점별 스냅샷이 `openapi/review/changes/history/`에 누적됩니다.

```text
openapi/
  changes.md                  # 사람이 먼저 여는 최신 Swagger 변경 비교
  changes.json                # 최신 변경 비교 JSON
  review/
    changes/
      history/
        <timestamp>.md
        <timestamp>.json
    catalog/
      endpoints.json          # 다음 refresh 비교 기준
      endpoints.md            # 전체 endpoint 목록
```

| 구분 | 의미 |
| --- | --- |
| `Added` | 새 endpoint가 추가됨 |
| `Removed` | 기존 endpoint가 삭제됨 |
| `Contract Changed` | request body, response body, path/query/header parameter 계약이 바뀜 |
| `Doc Changed` | summary, description, tag 같은 문서성 정보가 바뀜 |

`Contract Changed`는 요청/응답 전체를 AS-IS / TO-BE 2열 Markdown 표로 보여주며 추가/변경/삭제된 줄을 표시합니다. `Added`, `Contract Changed`, `Doc Changed`는 가능한 경우 Swagger UI 링크와 생성 후보 파일 링크도 함께 표시합니다.

실제 출력은 대략 다음처럼 렌더링됩니다.

> # Change Summary
>
> - Generated at: 2026-05-06T15:13:38.914Z
> - Current total endpoints: 284
> - History: [openapi/review/changes/history](<review/changes/history>)
> - Comparison baseline: [openapi/review/catalog/endpoints.json](<review/catalog/endpoints.json>)
> - 🆕 Added: 3
> - 🗑️ Removed: 6
> - 🧩 Contract Changed: 2
> - 📝 Doc Changed: 1
>
> ## 🆕 Added
>
> - [GET] `/users/{id}` - 사용자 상세 조회 [Swagger](<http://localhost:8080/swagger-ui/index.html#/...>)
>   - 후보 파일: [DTO](<project/src/openapi-generated/Users/get-user.dto.ts>) / [API](<project/src/openapi-generated/Users/get-user.api.ts>)
>
> ## 🗑️ Removed
>
> - ~~[GET] `/users/search` - 사용자 검색~~
>
> ## 🧩 Contract Changed
>
> - [PATCH] `/profiles/{id}` - 프로필 수정 [Swagger](<http://localhost:8080/swagger-ui/index.html#/...>)
>   - 후보 파일: [DTO](<project/src/openapi-generated/Profiles/update-profile.dto.ts>) / [API](<project/src/openapi-generated/Profiles/update-profile.api.ts>)
>
>   | 변경 | 위치 | AS-IS | TO-BE |
>   | --- | --- | --- | --- |
>   | 🟢 추가 | 요청 Body 필드 | 없음 | `displayName: String (optional)` |
>   | 🔴 삭제 | 응답 Body 필드 | `avatarUrl: String` | 없음 |
>   | 🟡 변경 | 요청 Body schema | `UpdateProfileRequest` | `ProfileUpdateRequest` |
>   | 🟡 변경 | 요청 Body 필드 | `nickname: String (optional)` | `nickname: String (required)` |
>
>   <details>
>   <summary>전체 AS-IS / TO-BE 보기</summary>
>
>   | AS-IS | TO-BE |
>   | --- | --- |
>   | 요청 | 요청 |
>   | **🟡 - Body: UpdateProfileRequest** | **🟡 - Body: ProfileUpdateRequest** |
>   | **🟡 &nbsp;&nbsp;- nickname: String (optional)** | **🟡 &nbsp;&nbsp;- nickname: String (required)** |
>   | &nbsp; | **🟢 &nbsp;&nbsp;- displayName: String (optional)** |
>   | &nbsp; | &nbsp; |
>   | 응답 | 응답 |
>   | - 200: ProfileResponse | - 200: ProfileResponse |
>   | - 필드 | - 필드 |
>   | &nbsp;&nbsp;- id: Long (required) | &nbsp;&nbsp;- id: Long (required) |
>   | &nbsp;&nbsp;- nickname: String (required) | &nbsp;&nbsp;- nickname: String (required) |
>   | ~~🔴 &nbsp;&nbsp;- avatarUrl: String (optional)~~ | &nbsp; |
>   </details>
>
> ## 📝 Doc Changed
>
> - [GET] `/products` - 상품 목록 조회 [Swagger](<http://localhost:8080/swagger-ui/index.html#/...>)
>   - 후보 파일: [DTO](<project/src/openapi-generated/Products/get-products.dto.ts>) / [API](<project/src/openapi-generated/Products/get-products.api.ts>)
>   - 🟡 요약 변경: 상품 조회 → 상품 목록 조회

</details>

<details>
<summary>생성되는 파일</summary>

| 파일 | 용도 |
| --- | --- |
| `openapi/README.md` | 대상 프로젝트에 생성되는 AI agent 작업 지침 |
| `openapi/changes.md` | 사람이 먼저 여는 최신 Swagger/OpenAPI 변경 비교 요약 |
| `openapi/changes.json` | 최신 변경 비교의 machine-readable JSON |
| `openapi/review/changes/history/` | 변경이 감지된 refresh 시점별 비교 스냅샷 |
| `openapi/config/project.jsonc` | OpenAPI JSON URL과 산출물 경로 설정. 보통 `sourceUrl`, 필요하면 `swaggerUiUrl`만 수정 |
| `openapi/config/project-rules.jsonc` | 프로젝트 API client/import/call style/hook 규칙 |
| `openapi/review/project-rules/analysis.md` | 프로젝트 API client/import/call style 분석 결과 |
| `openapi/review/project-rules/analysis.json` | AI와 자동화가 참고할 수 있는 분석 evidence |
| `openapi/project/summary.md` | 생성된 DTO/API/hook 후보와 skipped endpoint 요약 |
| `openapi/project/src/openapi-generated/` | 실제 앱 코드 반영 전 후보 코드 |

기본 `form` + `explode` query object parameter는 별도 wrapper DTO로 두지 않고 request DTO의 flat 필드로 펼쳐 생성합니다. 예를 들어 `pageable`과 `condition` query object는 `page`, `size`, `status` 같은 필드가 `XxxRequestDto`에 직접 들어갑니다.

`rules`는 `useQuery`/`useMutation` 사용을 감지하면 `openapi/config/project-rules.jsonc`의 `hooks.enabled`를 `true`로 자동 제안합니다. 기존 rules 파일에는 `hooks` 블록을 보강하되, 사용자가 명시한 `hooks.enabled=false`는 유지합니다.

</details>

<details>
<summary>선택적 Slack 알림</summary>

`openapi-projector`는 프론트엔드 후보 생성 외에도 백엔드 CI에서 OpenAPI 변경을 팀에 알리는 용도로 쓸 수 있습니다.

기본 흐름은 아래와 같습니다.

```text
backend deploy 완료
-> 배포된 /v3/api-docs 다운로드
-> 이전 endpoint catalog 기준선 복원
-> npx --yes openapi-projector@latest catalog 실행
-> openapi/changes.md / changes.json 생성
-> 변경이 있으면 Slack webhook으로 요약 전송
-> 갱신된 endpoint catalog를 다음 기준선으로 저장
```

이 흐름은 배포를 막는 breaking change gate가 아니라, 프론트엔드/백엔드/QA가 API 계약 변경을 빠르게 확인하는 팀 공지 용도입니다. GitHub Actions 예제와 설정 방법은 [docs/08-openapi-ci-slack-guide.md](docs/08-openapi-ci-slack-guide.md)에 있습니다.

</details>

<details>
<summary>명령과 업데이트</summary>

| 상황 | 명령 |
| --- | --- |
| 작업 공간 초기화 | `npx --yes openapi-projector@latest init` |
| 전체 준비 흐름 실행 | `npx --yes openapi-projector@latest prepare` |
| 설정과 URL 점검 | `npx --yes openapi-projector@latest doctor --check-url` |
| Swagger 변경 비교만 갱신 | `npx --yes openapi-projector@latest refresh` |
| 프로젝트 규칙 분석만 실행 | `npx --yes openapi-projector@latest rules` |
| 후보 코드 생성만 실행 | `npx --yes openapi-projector@latest project` |
| 기존 작업 공간 안전 갱신 | `npx --yes openapi-projector@latest update` |
| 생성 README만 최신화 | `npx --yes openapi-projector@latest upgrade-docs` |
| Codex 스킬 설치 | `npx --yes openapi-projector@latest install-skill --yes` |
| 팀/CI에서 재현성 우선 | `npx --yes openapi-projector@<version> <command>` |
| 전역 설치 사용 | `openapi-projector <command>` |

`npx --yes openapi-projector <command>`는 npm 캐시나 태그 상태에 따라 최신 배포본이 아닐 수 있습니다. 새 기능을 확인할 때는 `@latest`를 권장합니다.

</details>

## 문서

- 변경 이력: [CHANGELOG.md](CHANGELOG.md)
- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- Backend CI OpenAPI Slack Guide: [docs/08-openapi-ci-slack-guide.md](docs/08-openapi-ci-slack-guide.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)

## 기여자

<table align="center">
  <tr>
    <td align="center" width="140">
      <a href="https://github.com/safience-oat">
        <img src="https://github.com/safience-oat.png?size=120" width="72" height="72" alt="safience-oat" />
        <br />
        <sub><b>safience-oat</b></sub>
      </a>
    </td>
    <td align="center" width="140">
      <a href="https://github.com/ph-1dnjs">
        <img src="https://github.com/ph-1dnjs.png?size=120" width="72" height="72" alt="ph-1dnjs" />
        <br />
        <sub><b>ph-1dnjs</b></sub>
      </a>
    </td>
  </tr>
</table>
