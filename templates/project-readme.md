# openapi-projector Workspace Guide

이 `openapi/` 디렉터리는 `openapi-projector init`이 만든 작업 공간입니다.

Swagger/OpenAPI 변경 비교와 DTO/API/hook 후보 생성을 실제 앱 코드와 분리해 둡니다.

사람은 빠른 시작만 보면 됩니다. AI coding agent는 아래의 접힌 상세 지침까지 읽고 작업합니다.

## 빠른 시작

이 문서는 `init` 이후 생성된 작업 안내서입니다. 프론트엔드 프로젝트 루트에서 진행합니다.

### Step 1. OpenAPI JSON URL 확인

`openapi/config/project.jsonc`의 `sourceUrl`이 Swagger UI 페이지가 아니라 OpenAPI JSON URL인지 확인합니다.

기본값은 `http://localhost:8080/v3/api-docs`입니다. 백엔드 주소가 다르면 아래 값을 수정합니다.

```jsonc
{
  "sourceUrl": "http://localhost:8080/v3/api-docs"
}
```

대화형 `init`에서 URL 검증이 VPN, 인증, 백엔드 미기동 때문에 실패했다면 `skip`으로 저장한 뒤 여기서 나중에 수정할 수 있습니다.

### Step 2. AI에게 맡기거나 직접 진행

아래 둘 중 하나로 진행합니다.

#### Option A. AI에게 맡기기

프론트엔드 프로젝트에서 사용하는 AI coding agent에게 아래 프롬프트를 그대로 붙여넣으세요.

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

1. 먼저 openapi/README.md를 읽어.
2. 아래 명령은 프론트엔드 프로젝트 루트에서 실행해.
3. 사람이 npx --yes openapi-projector prepare를 미리 실행했다면 openapi/changes.md를 가장 먼저 확인해.
   최신 여부가 불확실하면 아래 명령을 다시 실행해.
4. openapi/config/project.jsonc의 sourceUrl이 Swagger UI 페이지가 아니라 OpenAPI JSON URL인지 확인해.
   sourceUrl이 비어 있거나 잘못되어 있으면 나에게 올바른 OpenAPI JSON URL을 물어봐.
5. npx --yes openapi-projector doctor --check-url을 실행해.
6. npx --yes openapi-projector prepare를 실행하고 openapi/changes.md를 확인해.
   Added, Removed, Contract Changed, Doc Changed를 endpoint별로 먼저 요약해서 나에게 알려줘.
7. prepare가 rules 검토 단계에서 멈췄다면 openapi/review/project-rules/analysis.md와 analysis.json을 읽고,
   실제 프로젝트의 API client, import 경로, request 호출 방식을 확인해.
8. rules가 만든 openapi/config/project-rules.jsonc 초안이 프로젝트 컨벤션과 맞는지 확인해.
   React Query를 쓰는 프로젝트라면 hooks.enabled가 true로 자동 제안됐는지도 확인해.
   맞지 않는 부분이 있으면 수정하고, 맞다고 판단되면 review.rulesReviewed를 true로 바꿔.
9. review.rulesReviewed를 true로 바꾼 뒤 npx --yes openapi-projector prepare를 다시 실행해.
10. openapi/project/summary.md를 읽고 생성된 endpoint와 skipped endpoint를 요약해.

아직 실제 앱 코드에는 반영하지 말고, Swagger 변경 비교 요약과 DTO/API/hook 후보 요약을 나눈 뒤 내가 어떤 endpoint를 적용할지 아래 형식으로 물어봐.

적용할 endpoint:
- <METHOD> <PATH> 또는 operationId

반영 범위:
- DTO만
- DTO + API wrapper
- DTO + API wrapper + React Query hook

사용할 실제 앱 코드 위치:
- <예: src/features/user/api>

내가 endpoint를 정하면 openapi/project/의 후보 코드를 프로젝트 컨벤션에 맞게 실제 앱 코드에 반영해.
프로젝트에서 typecheck, lint, 관련 테스트를 사용 중이면 반영 후 실행해.
```

API wrapper까지 필요하면 위 프롬프트 그대로 쓰면 됩니다. DTO만 필요하면 아래 문장을 추가하세요.

```text
API wrapper는 반영하지 말고, 요청한 endpoint의 .dto.ts 후보만 실제 앱 코드 구조에 맞게 옮겨줘.
```

#### Option B. 직접 진행하기

아래 명령을 실행합니다.

```bash
npx --yes openapi-projector prepare
```

`prepare`는 아래 흐름을 한 번에 실행합니다.

```text
refresh -> rules -> project
```

- `refresh`: Swagger/OpenAPI를 내려받고 이전 버전과 비교해 `openapi/changes.md`를 만듭니다.
- `rules`: 현재 프론트엔드 프로젝트의 API 호출 규칙과 React Query 사용 여부를 분석해 `openapi/config/project-rules.jsonc`를 만듭니다.
- `project`: 검토된 규칙으로 DTO/API 후보와 선택적 React Query hook 후보를 생성합니다.

처음 실행하면 `rules` 검토 단계에서 멈추는 것이 정상입니다.

`openapi/review/project-rules/analysis.md`와 `openapi/review/project-rules/analysis.json`을 확인한 뒤, 실제 프로젝트 규칙과 맞으면 `openapi/config/project-rules.jsonc`에서 `review.rulesReviewed`를 `true`로 바꿉니다.

먼저 볼 파일:

| 파일 | 볼 내용 |
| --- | --- |
| `openapi/changes.md` | OpenAPI endpoint 추가/삭제/계약 변경 요약 |
| `openapi/review/project-rules/analysis.md` | 프로젝트 API client/import/call style 분석 결과 |
| `openapi/review/project-rules/analysis.json` | AI와 자동화가 참고할 수 있는 분석 evidence |
| `openapi/config/project-rules.jsonc` | 검토 후 `review.rulesReviewed`를 `true`로 바꿀 규칙 초안 |
| `openapi/project/summary.md` | `rulesReviewed=true` 이후 생성되는 DTO/API/hook 후보 요약 |

```jsonc
{
  "review": {
    "rulesReviewed": true
  }
}
```

그 다음 `prepare`를 다시 실행합니다.

```bash
npx --yes openapi-projector prepare
```

두 번째 실행부터는 `openapi/project/summary.md`와 `openapi/project/src/openapi-generated/` 아래 DTO/API 후보와 선택적 React Query hook 후보가 생성됩니다.

## Swagger 변경 비교

가장 먼저 보는 산출물은 `openapi/changes.md`입니다. DTO/API 후보 생성이 필요하지 않고 Swagger 변경점만 확인할 때는 `refresh`를 단독으로 실행합니다.

```bash
npx --yes openapi-projector refresh
```

최신 비교 결과는 매번 `openapi/changes.md`와 `openapi/changes.json`에 덮어써지고, 변경이 있으면 `openapi/review/changes/history/`에 시점별 스냅샷이 쌓입니다.

현재 생성되는 비교 문서 위치:

```text
openapi/
  changes.md
  changes.json
  review/
    changes/history/
      <timestamp>.md
      <timestamp>.json
    catalog/
      endpoints.json
      endpoints.md
```

`openapi/changes.md`에서 먼저 볼 구분:

| 구분 | 의미 |
| --- | --- |
| `Added` | 새 endpoint가 추가됨 |
| `Removed` | 기존 endpoint가 삭제됨 |
| `Contract Changed` | request body, response body, path/query/header parameter 계약이 바뀜 |
| `Doc Changed` | summary, description, tag 같은 문서성 정보가 바뀜 |

`Contract Changed`는 요청/응답 전체를 AS-IS / TO-BE 2열 Markdown 표로 보여주고 추가/변경/삭제된 줄을 표시합니다. `Added`는 새 endpoint 목록과 Swagger UI 링크를 표시하고, `Removed`는 삭제된 endpoint 목록만 표시합니다.

## 명령을 나눠서 실행하기

단계를 나눠 보고 싶으면 아래처럼 실행합니다.

```bash
npx --yes openapi-projector doctor --check-url
npx --yes openapi-projector refresh
npx --yes openapi-projector rules
# openapi/config/project-rules.jsonc 검토 후 review.rulesReviewed=true 설정
npx --yes openapi-projector project
```

## 생성되는 파일

```text
openapi/
  changes.md
  changes.json
  config/
    project.jsonc
    project-rules.jsonc
  review/
    catalog/
    changes/history/
    docs/
    generated/schema.ts
    project-rules/
  project/
    summary.md
    src/openapi-generated/
```

| 파일 | 볼 내용 |
| --- | --- |
| `openapi/README.md` | 지금 읽고 있는 작업 안내서입니다. 빠른 시작과 AI agent용 상세 지침을 포함합니다. |
| `openapi/config/project.jsonc` | OpenAPI JSON URL과 산출물 경로 설정입니다. `sourceUrl`을 먼저 확인합니다. |
| `openapi/config/project-rules.jsonc` | API client/import/call style 규칙 초안입니다. `rules` 실행 후 실제 프로젝트와 맞는지 검토합니다. |
| `openapi/changes.md` | 사람이 먼저 여는 최신 Swagger/OpenAPI 변경 비교 |
| `openapi/changes.json` | AI와 자동화가 읽기 쉬운 최신 변경 비교 |
| `openapi/review/changes/history/` | 변경이 감지된 refresh 시점별 비교 스냅샷 |
| `openapi/review/project-rules/analysis.md` | 프로젝트 API client/import/call style 분석 결과 |
| `openapi/review/project-rules/analysis.json` | AI와 자동화가 참고할 수 있는 분석 evidence |
| `openapi/project/summary.md` | 생성된 DTO/API/hook 후보와 skipped endpoint 요약 |

기본 `form` + `explode` query object parameter는 별도 wrapper DTO로 두지 않고 request DTO의 flat 필드로 펼쳐 생성합니다. 예를 들어 `pageable`과 `condition` query object는 `page`, `size`, `status` 같은 필드가 `XxxRequestDto`에 직접 들어갑니다.

<details>
<summary>AI Agents: Detailed Workflow</summary>

## For AI Agents: Detailed Workflow

Read this workflow before modifying generated API code. The first goal is to compare the current Swagger/OpenAPI contract with the previous snapshot and explain what changed. Only after that should you inspect generated candidates, adapt the project rules to the current frontend project, and copy useful DTO/API/hook code into the real application source tree.

### 1. Required Setup

Open `openapi/config/project.jsonc` and confirm `sourceUrl` points to the real OpenAPI JSON URL.

```jsonc
{
  "sourceUrl": "<openapi-json-url>"
}
```

Rules:

- `sourceUrl` must return OpenAPI JSON.
- Do not use a Swagger UI page URL.
- The default `sourceUrl` is `http://localhost:8080/v3/api-docs`. Keep it only when the local backend exposes OpenAPI JSON there.
- If `sourceUrl` is empty, `doctor` and `prepare` should fail.
- The URL should be reachable with a plain local `GET` request. If the Swagger/OpenAPI endpoint requires cookies, tokens, VPN-only browser state, or custom headers, prepare a reachable OpenAPI JSON URL before running `doctor --check-url`.

If this workspace has already been initialized, update `openapi/config/project.jsonc` instead of re-running `init`.

### 2. Recommended Prepare Flow

Run commands from the frontend project root.

```bash
npx --yes openapi-projector doctor
npx --yes openapi-projector doctor --check-url
npx --yes openapi-projector prepare
```

Command roles:

- `doctor`: validates local config, project config, source URL, and rules readiness.
- `doctor --check-url`: also verifies that the OpenAPI JSON URL is reachable.
- `prepare`: runs `refresh -> rules -> project`, but only continues to `project` after `openapi/config/project-rules.jsonc` has `"review": { "rulesReviewed": true }`.
- `refresh`, `rules`, and `project`: lower-level commands used by `prepare`. Run them separately only when you need to isolate a step.

After `prepare`, read and summarize `openapi/changes.md` before touching app code. If `prepare` stops at the rules review gate, inspect `openapi/review/project-rules/analysis.md`, `openapi/review/project-rules/analysis.json`, and the real frontend API client. Edit `openapi/config/project-rules.jsonc` only when needed, set `review.rulesReviewed` to `true` after confirmation, then run `prepare` again.

Command-by-command fallback:

```bash
npx --yes openapi-projector refresh
# Read and summarize openapi/changes.md before touching app code
npx --yes openapi-projector rules
# Read openapi/review/project-rules/analysis.md
# Keep openapi/review/project-rules/analysis.json for machine-readable evidence
# Edit openapi/config/project-rules.jsonc for this project
# Set review.rulesReviewed to true after confirming the rules
npx --yes openapi-projector project
```

### 3. Repeated Runs: Review OpenAPI Changes

After every `refresh` or `prepare`, read the change summary before touching app code.

Primary files:

- `openapi/changes.md`
- `openapi/changes.json`
- `openapi/review/changes/history/`

`openapi/changes.md` and `openapi/changes.json` are overwritten on each run and always represent the latest comparison.
When changes are detected, timestamped `.md` and `.json` snapshots are also appended under `openapi/review/changes/history/`.

How to interpret `openapi/changes.md`:

- `Baseline`: first run or no usable previous catalog. Treat this as the initial snapshot.
- `Added`: new endpoints.
- `Removed`: endpoints that disappeared from the OpenAPI spec.
- `Contract Changed`: request/response/path/query/header contract changed. Review generated DTO/API/hook code carefully.
- `Doc Changed`: summary/description/tag metadata changed without detected contract changes.

`Contract Changed` items include a comparison table with field-level details when both the previous and current catalogs have comparison snapshots.
Examples include query parameter additions, request body required changes, response body field type changes, and response status/media-type changes.
`Added`, `Contract Changed`, and `Doc Changed` entries also include DTO/API candidate links based on `project-rules.jsonc`; if React Query hooks are enabled, hook candidates are generated in the same output tree. After `project` runs, those links open the generated files under `openapi/project/src/openapi-generated/...`.
If the previous catalog was created by an older version without snapshots, the first run after upgrade can only report the affected endpoint; detailed comparison starts from the next refresh.

Recommended AI behavior:

1. If this is a baseline run, run `rules`, review `project-rules.jsonc` against the real API client, set `review.rulesReviewed` to true, then run `project`.
2. If `Contract Changed` or `Removed` is non-zero, inspect affected endpoint docs under `openapi/review/docs/` before applying code.
3. If only `Doc Changed` changed, avoid unnecessary app code edits unless naming or comments must be updated.
4. If `Added` endpoints exist, generate candidates and apply only the endpoints requested by the user.
### 4. After `rules`: Adapt Project Rules

After running `npx --yes openapi-projector rules`, read both files:

- `openapi/review/project-rules/analysis.md`
- `openapi/review/project-rules/analysis.json`
- `openapi/config/project-rules.jsonc`

Then inspect the real project source before editing `project-rules.jsonc`.

`analysis.md` is for human review. `analysis.json` preserves the same evidence in a machine-readable format for AI agents, tests, and future automation.

How `rules` analyzed the project:

- It scans TypeScript files under `src/`, excluding `node_modules` and `.git`.
- It summarizes scanned source sections such as `src/shared`, `src/features`, `src/entities`, and `src/services`.
- It reads `tsconfig.json` / `jsconfig.json` path aliases and normalizes relative helper imports when possible.
- It detects likely HTTP clients from dependencies and imports such as `axios`, `ky`, and `fetch`.
- It detects likely API helpers from imports and calls using names such as `fetchAPI`, `apiClient`, `request`, `http`, `client`, and `httpClient`.
- It records evidence and confidence, not final truth. AI agents must cross-check the result against the real frontend code before applying generated candidates.

Recommended AI follow-up after reading `analysis.json`:

1. Inspect `warnings`. If a warning exists, treat generated `project-rules.jsonc` as unconfirmed.
2. Open the evidence files listed under `apiHelper.evidence` and `apiLayer.evidence`.
3. Verify the import kind: named imports use `"fetchApiImportKind": "named"`, default imports use `"fetchApiImportKind": "default"`.
4. Verify the call style. If existing code uses `fetchAPI('/url', config)`, use `url-config`. If it uses `fetchAPI({ url, ...config })`, use `request-object`.
5. If the project uses member calls like `apiClient.get('/url')`, do not assume generated wrappers can be copied as-is. Generated wrappers only support `url-config` and `request-object`, so use an existing compatible wrapper or ask before adding a new helper.
6. After manual/AI verification, set `"review": { "rulesReviewed": true }` in `project-rules.jsonc` and then run `npx --yes openapi-projector project` or `npx --yes openapi-projector prepare` again.

Useful searches:

```bash
rg "fetchAPI|apiClient|request|axios|ky|httpClient" src
rg "import .* from ['\"].*(api|http|client|request|axios|ky)" src
rg "method:|url:|params:|query:|data:|body:|headers:" src
```

If the project has a focused API layer, inspect it directly. Common locations:

```text
src/shared/api
src/shared/http
src/shared/lib
src/services
src/api
src/entities
src/features
```

### 5. How to Fill `project-rules.jsonc`

Open:

```text
openapi/config/project-rules.jsonc
```

Typical shape:

```jsonc
{
  "review": {
    "rulesReviewed": false,
    "scaffoldSignature": "<generated-scaffold-signature>",
    "notes": []
  },
  "api": {
    "fetchApiImportPath": "@/shared/api",
    "fetchApiSymbol": "fetchAPI",
    "fetchApiImportKind": "named",
    "adapterStyle": "url-config",
    "wrapperGrouping": "tag",
    "tagFileCase": "title"
  },
  "hooks": {
    "enabled": false,
    "library": "@tanstack/react-query",
    "queryMethods": ["GET"],
    "mutationMethods": ["POST", "PUT", "PATCH", "DELETE"],
    "queryKeyStrategy": "path-and-params",
    "responseUnwrap": "none"
  },
  "layout": {
    "schemaFileName": "schema.ts"
  }
}
```

Edit these fields based on the real project:

| Field | What to verify |
| --- | --- |
| `api.fetchApiImportPath` | Import path of the existing HTTP client/helper used by app code. |
| `api.fetchApiSymbol` | Imported function/object name used to make requests. |
| `api.fetchApiImportKind` | Import form for the helper: `named` or `default`. |
| `api.adapterStyle` | Existing request call shape: `url-config` or `request-object`. |
| `api.wrapperGrouping` | Candidate file layout: `tag` creates tag folders, `flat` writes endpoint files directly under the generated root. |
| `api.tagFileCase` | Generated tag folder naming convention. Usually `title` unless the project prefers kebab-case. |
| `hooks.enabled` | Generated from React Query usage analysis when possible. Set to `true` to generate React Query hook candidates; explicit `false` is preserved. |
| `hooks.queryKeyStrategy` | `path-and-params` creates `[path, params]`; `path-and-fields` expands flat DTO fields. |
| `hooks.responseUnwrap` | Set to `data` only when generated hooks should return `response.data`. |
| `hooks.staleTimeImportPath` / `hooks.staleTimeSymbol` | Optional staleTime import for query hooks, for example `@/shared/constant/api` and `STALE_TIME`. |
| `review.rulesReviewed` | Set to `true` only after checking `analysis.md`, `analysis.json`, and the real API client code. |

### `adapterStyle` Decision

Use `url-config` when existing code calls the client like this:

```ts
fetchAPI('/users', {
  method: 'GET',
  params,
  data,
});
```

Use `request-object` when existing code calls the client like this:

```ts
fetchAPI({
  url: '/users',
  method: 'GET',
  params,
  data,
});
```

If the project uses Axios directly, choose the style that best matches the wrapper you will import. Do not invent a new HTTP client unless explicitly asked.

### 6. After `project`: Review Candidate Output

Run:

```bash
npx --yes openapi-projector project
```

Then read:

- `openapi/project/summary.md`
- `openapi/project/src/openapi-generated/`

Generated candidates include the review `schema.ts` plus endpoint-scoped `.dto.ts` and `.api.ts` files. `project` does not create barrel `index.ts` files.

Start with the `Application Review` section in `summary.md`. It records the runtime wrapper import/call shape and each generated endpoint's request DTO, response DTO, params, body schema, media types, and generated files.

Check generated API files for:

- Correct import path from `fetchApiImportPath`.
- Correct imported symbol from `fetchApiSymbol`.
- Correct request call shape from `adapterStyle`.
- Correct path/query/body/header parameter handling.
- Request DTO fields match how the real feature code builds params/body/header values.
- Response DTO fields match how the real UI, hooks, stores, and mappers consume the returned value.
- Generated wrappers assume the imported client returns the response body as `T`. If the real client returns `AxiosResponse<T>` or `{ data: T }`, adapt the wrapper/client usage before copying `.api.ts`.
- Path parameters are URL-encoded before being inserted into endpoint URLs.
- Unsupported endpoints are listed under `Skipped Operations` in `openapi/project/summary.md`.
- No generated code copied into the app until it matches the existing project conventions.

If generated code is wrong, edit `openapi/config/project-rules.jsonc` and run `npx --yes openapi-projector project` again.

If `project` rejects `project-rules.jsonc`, fix the reported field first. Common validation failures are invalid `api.fetchApiSymbol`, unsupported `api.adapterStyle`, unsupported `api.tagFileCase`, unsupported `api.wrapperGrouping`, and `layout.schemaFileName` values that are paths instead of file names.

### 7. Applying Code to the App

Do not treat `openapi/project/src/openapi-generated/` as final app code.

Recommended process:

1. Read `openapi/project/summary.md`.
2. For each requested endpoint, compare the `Application Review` request/response contract with the real feature code that will call it.
3. Pick the endpoint DTO/API candidates you actually need.
4. Copy or adapt them into the real app source tree.
5. Align naming, folder location, imports, error handling, response unwrapping, and client usage with existing code.
6. If the project uses them, run typecheck, lint, and relevant tests.

If the user only needs DTOs, copy or adapt only the `.dto.ts` candidates and ignore the generated `.api.ts` wrappers. Still review `openapi/project/summary.md` first so skipped or unsupported endpoints are not missed.

### 8. Files You Usually Should Not Edit Manually

- `openapi/_internal/source/openapi.json`: downloaded OpenAPI source cache.
- `openapi/changes.md`: latest change comparison regenerated by `refresh`.
- `openapi/changes.json`: latest change comparison JSON regenerated by `refresh`.
- `openapi/review/`: review artifacts regenerated by `refresh`.
- `openapi/project/`: candidate artifacts regenerated by `project` or `prepare`.

Manual edits should usually go into:

- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- Real app source files outside `openapi/`

</details>
