# openapi-projector Agent Guide

이 `openapi/` 디렉터리는 `openapi-projector init`이 만든 작업 공간입니다.

Swagger/OpenAPI 변경 비교와 DTO/API/hook 후보 생성을 실제 앱 코드와 분리해 둡니다.

이 문서는 AI coding agent가 매 작업 시작 시 읽는 프로젝트별 작업 지침입니다. 사람에게 보여줄 소개와 복사용 프롬프트는 루트 `README.md`를 기준으로 합니다.

사람이 직접 진행할 때만 [빠른 시작](#빠른-시작)을 보면 됩니다.

## 목차

1. [AI agent 작업 지침](#ai-agent-작업-지침) - AI가 매 작업 시작 시 따라야 할 기준
2. [빠른 시작](#빠른-시작) - 사람이 직접 진행할 때 필요한 최소 흐름
3. [Swagger 변경 비교](#swagger-변경-비교) - `changes.md`와 변경 구분
4. [명령을 나눠서 실행하기](#명령을-나눠서-실행하기) - `doctor`, `refresh`, `rules`, `project`
5. [생성되는 파일](#생성되는-파일) - `openapi/` 작업 공간 구조
6. [For AI Agents: Detailed Workflow](#for-ai-agents-detailed-workflow) - 세부 판단 기준

## AI agent 작업 지침

작업 기준:

- 프론트엔드 프로젝트 루트는 `package.json`이 있는 앱 루트입니다.
- 모든 `openapi-projector` 명령은 프론트엔드 프로젝트 루트에서 실행합니다.
- `openapi/config/project.jsonc`의 산출물 경로 필드는 도구가 관리합니다. 코드 스타일, API client 규칙, 앱 배치 조정은 `openapi/config/project-rules.jsonc`에서만 검토합니다.
- generated `.api.ts`를 그대로 실제 앱 코드에 복사하지 않습니다. 항상 실제 프로젝트의 API client, URL constant, response wrapper, DTO/export style, error handling, query/cache 규칙에 맞게 조정합니다.
- 사용자가 endpoint를 이미 지정했다면 적용 직전 `prepare`로 최신 Swagger/OpenAPI를 받아 후보를 갱신한 뒤 그 endpoint를 적용합니다. endpoint가 없다면 prepare 결과를 근거로 적용할 endpoint를 물어봅니다.
- `prepare`가 URL, 백엔드, 인증, 네트워크 문제로 실패하면 기존 `openapi/project/` 후보가 있을 때만 마지막 성공 후보 기준으로 진행하고, 사용자에게 오래된 후보일 수 있음을 알립니다. 기존 후보도 없으면 적용하지 않고 실패 원인을 보고합니다.
- CLI가 `update`, `upgrade-docs`, 또는 `install-skill --force`를 권장하더라도 자동으로 덮어쓰지 않습니다. 어떤 파일/스킬이 갱신되는지 설명하고 사용자 동의를 받은 뒤 실행합니다.

진행 순서:

1. `openapi/config/project.jsonc`의 `sourceUrl`이 OpenAPI JSON URL인지 확인합니다.
2. `npx --yes openapi-projector@latest doctor --check-url`을 실행합니다.
3. `npx --yes openapi-projector@latest prepare`를 실행합니다.
4. prepare가 rules 검토 단계에서 멈추면 아래 파일을 읽고 실제 프로젝트 코드와 대조합니다.
   - `openapi/review/project-rules/analysis.md`
   - `openapi/review/project-rules/analysis.json`
   - `openapi/config/project-rules.jsonc`
5. rules는 실제 프로젝트의 API client, import 경로, request 호출 방식, response wrapper, React Query 사용 근거로 확인합니다.
6. rules가 맞지 않으면 `openapi/config/project-rules.jsonc`를 최소 수정합니다. 근거 없이 추측으로 바꾸지 않습니다.
7. rules가 확인되면 `review.rulesReviewed=true`로 바꾸고 `npx --yes openapi-projector@latest prepare`를 다시 실행합니다.
8. `openapi/changes.md`와 `openapi/project/summary.md`는 내부 근거로 읽고, 사용자에게는 실제 앱 반영에 영향이 있는 중요 변경이나 리스크만 짧게 보고합니다.
9. 명령 실행 중 최신 기본값/안내문 업데이트가 필요하다는 메시지가 나오면 자동 실행하지 말고 사용자에게 물어봅니다. 동의하면 `npx --yes openapi-projector@latest update` 또는 필요한 업데이트 명령을 실행한 뒤 이어서 진행합니다.
10. endpoint 적용 시 `openapi/project/src/openapi-generated/`의 후보를 참고하되, 실제 앱 코드에는 프로젝트 컨벤션에 맞게 옮깁니다.
11. 반영 후 프로젝트에서 쓰는 typecheck, lint, 관련 테스트 중 가장 좁은 검증을 실행합니다.

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

### 기존 작업 공간 업데이트

이미 `openapi/` 작업 공간이 있는 프로젝트에서 최신 CLI 안내와 규칙 기본값만 갱신하려면 `init --force` 대신 아래 명령을 사용합니다.

```bash
npx --yes openapi-projector@latest update
```

이 명령은 `openapi/config/project.jsonc`, review history, generated candidates를 보존하고 생성 안내문, 로컬 설정, `project-rules.jsonc`의 안전한 기본값만 갱신합니다.

### Step 2. 직접 진행하기

아래 명령을 실행합니다.

```bash
npx --yes openapi-projector@latest prepare
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
npx --yes openapi-projector@latest prepare
```

두 번째 실행부터는 `openapi/project/summary.md`와 `openapi/project/src/openapi-generated/` 아래 DTO/API 후보와 선택적 React Query hook 후보가 생성됩니다.

## Swagger 변경 비교

가장 먼저 보는 산출물은 `openapi/changes.md`입니다. DTO/API 후보 생성이 필요하지 않고 Swagger 변경점만 확인할 때는 `refresh`를 단독으로 실행합니다.

```bash
npx --yes openapi-projector@latest refresh
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
npx --yes openapi-projector@latest doctor --check-url
npx --yes openapi-projector@latest refresh
npx --yes openapi-projector@latest rules
# openapi/config/project-rules.jsonc 검토 후 review.rulesReviewed=true 설정
npx --yes openapi-projector@latest project
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
| `openapi/README.md` | 지금 읽고 있는 AI agent 작업 지침입니다. 사람이 직접 진행할 때 필요한 빠른 시작도 포함합니다. |
| `openapi/config/project.jsonc` | OpenAPI JSON URL과 산출물 경로 설정입니다. 보통 `sourceUrl`, 필요하면 `swaggerUiUrl`만 확인합니다. |
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
- Treat generated artifact path fields such as `sourcePath`, `docsDir`, `generatedSchemaPath`, `projectRulesAnalysisPath`, `projectRulesAnalysisJsonPath`, and `projectGeneratedSrcDir` as tool-managed. Do not change them to force code style or app placement. Use `openapi/config/project-rules.jsonc` and the real app source for convention decisions.

If this workspace has already been initialized, update `openapi/config/project.jsonc` instead of re-running `init`.

### 2. Recommended Prepare Flow

Run commands from the frontend project root.

```bash
npx --yes openapi-projector@latest doctor
npx --yes openapi-projector@latest doctor --check-url
npx --yes openapi-projector@latest prepare
```

Command roles:

- `doctor`: validates local config, project config, source URL, and rules readiness.
- `doctor --check-url`: also verifies that the OpenAPI JSON URL is reachable.
- `prepare`: runs `refresh -> rules -> project`, but only continues to `project` after `openapi/config/project-rules.jsonc` has `"review": { "rulesReviewed": true }`.
- `refresh`, `rules`, and `project`: lower-level commands used by `prepare`. Run them separately only when you need to isolate a step.

After `prepare`, read and summarize `openapi/changes.md` before touching app code. If `prepare` stops at the rules review gate, inspect `openapi/review/project-rules/analysis.md`, `openapi/review/project-rules/analysis.json`, and the real frontend API client. Edit `openapi/config/project-rules.jsonc` only when needed, set `review.rulesReviewed` to `true` after confirmation, then run `prepare` again.

Command-by-command fallback:

```bash
npx --yes openapi-projector@latest refresh
# Read and summarize openapi/changes.md before touching app code
npx --yes openapi-projector@latest rules
# Read openapi/review/project-rules/analysis.md
# Keep openapi/review/project-rules/analysis.json for machine-readable evidence
# Edit openapi/config/project-rules.jsonc for this project
# Set review.rulesReviewed to true after confirming the rules
npx --yes openapi-projector@latest project
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

After running `npx --yes openapi-projector@latest rules`, read both files:

- `openapi/review/project-rules/analysis.md`
- `openapi/review/project-rules/analysis.json`
- `openapi/config/project-rules.jsonc`

Then inspect the real project source before editing `project-rules.jsonc`.
Do not edit `openapi/config/project.jsonc` artifact paths while adapting rules. Use analysis evidence to adjust only `project-rules.jsonc` and the eventual app code placement.

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
6. After manual/AI verification, set `"review": { "rulesReviewed": true }` in `project-rules.jsonc` and then run `npx --yes openapi-projector@latest project` or `npx --yes openapi-projector@latest prepare` again.

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
npx --yes openapi-projector@latest project
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

If generated code is wrong, edit `openapi/config/project-rules.jsonc` and run `npx --yes openapi-projector@latest project` again.

If `project` rejects `project-rules.jsonc`, fix the reported field first. Common validation failures are invalid `api.fetchApiSymbol`, unsupported `api.adapterStyle`, unsupported `api.tagFileCase`, unsupported `api.wrapperGrouping`, and `layout.schemaFileName` values that are paths instead of file names.

### 7. Applying Code to the App

Do not treat `openapi/project/src/openapi-generated/` as final app code.

Recommended process:

1. Read `openapi/project/summary.md`, especially the `Application Review` section.
2. Re-check `openapi/review/project-rules/analysis.md` and `openapi/review/project-rules/analysis.json` for the API client/import/call-style evidence.
3. For each requested endpoint, compare the `Application Review` request/response contract with the real feature code that will call it.
4. Pick the endpoint DTO/API candidates you actually need.
5. Copy or adapt them into the real app source tree.
6. Align naming, folder location, URL constants, existing DTO reuse, imports, export style, error handling, response unwrapping, and client usage with existing code.
7. If the project uses them, run typecheck, lint, and relevant tests.

If the user only needs DTOs, copy or adapt only the `.dto.ts` candidates and ignore the generated `.api.ts` wrappers. Still review `openapi/project/summary.md` first so skipped or unsupported endpoints are not missed.

### 8. Files You Usually Should Not Edit Manually

- `openapi/_internal/source/openapi.json`: downloaded OpenAPI source cache.
- `openapi/changes.md`: latest change comparison regenerated by `refresh`.
- `openapi/changes.json`: latest change comparison JSON regenerated by `refresh`.
- `openapi/review/`: review artifacts regenerated by `refresh`.
- `openapi/project/`: candidate artifacts regenerated by `project` or `prepare`.

Manual edits should usually go into:

- `openapi/config/project.jsonc` only for `sourceUrl`, `swaggerUiUrl`, or a deliberate workspace path change
- `openapi/config/project-rules.jsonc`
- Real app source files outside `openapi/`

</details>
