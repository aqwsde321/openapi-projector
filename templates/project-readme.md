# openapi-projector Workspace Guide

이 `openapi/` 디렉터리는 `npx --yes openapi-projector init`으로 생성된 작업 공간입니다.

사람은 이 문서의 상단 요약만 보면 됩니다. 실제 OpenAPI 반영 작업은 보통 AI coding agent에게 맡기고, AI가 필요한 경우 아래의 접힌 상세 지침을 읽도록 합니다.

명령 예시는 npm 패키지를 바로 실행하는 `npx --yes openapi-projector` 기준입니다. 전역 설치했다면 `openapi-projector`로 바꿔 실행해도 됩니다.

## 사람용 요약

### 1. OpenAPI JSON URL 확인

`openapi/config/project.jsonc`의 `sourceUrl`이 Swagger UI 페이지가 아니라 OpenAPI JSON 요청 URL인지 확인합니다.

```jsonc
{
  "sourceUrl": "https://example.com/v3/api-docs"
}
```

### 2. AI에게 작업 맡기기

`openapi-projector` 저장소의 README에 있는 `AI에게 붙여넣기` 프롬프트를 사용하세요.

AI에게 요청할 때는 적용할 endpoint, 반영 범위, 실제 앱 코드 위치를 같이 적어주는 것이 좋습니다.

```text
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

### 3. 사람이 직접 실행할 때

프론트엔드 프로젝트 루트에서 실행합니다.

```bash
npx --yes openapi-projector prepare
```

`prepare`는 `refresh -> rules`를 실행하고, `review.rulesReviewed`가 `true`이면 `project`까지 이어서 실행합니다.

처음 적용할 때는 보통 규칙 검토 단계에서 멈춥니다. 이때 `openapi/review/project-rules/analysis.md`를 보고 `openapi/config/project-rules.jsonc`를 프로젝트에 맞게 수정한 뒤, `review.rulesReviewed`를 `true`로 바꾸고 `npx --yes openapi-projector prepare`를 다시 실행합니다.

생성된 `openapi/project/` 코드는 최종 앱 코드가 아니라 검토용 후보입니다. 필요한 DTO/API만 실제 앱 코드 위치로 복사하거나 프로젝트 컨벤션에 맞게 수정합니다.

<details>
<summary>명령을 나눠서 실행하고 싶을 때</summary>

| 순서 | 명령 | 하는 일 | 생성 파일 | 확인 파일 |
| --- | --- | --- | --- | --- |
| 1 | `npx --yes openapi-projector doctor --check-url` | 설정과 OpenAPI JSON URL 접근 가능 여부를 확인합니다. | 없음 | `openapi/config/project.jsonc` |
| 2 | `npx --yes openapi-projector refresh` | OpenAPI JSON을 내려받고 endpoint 문서, schema, 변경 요약을 생성합니다. | `openapi/review/changes/summary.md`, `openapi/review/docs/`, `openapi/review/generated/schema.ts` | `openapi/review/changes/summary.md` |
| 3 | `npx --yes openapi-projector rules` | 현재 프로젝트의 API client/import/call style을 분석하고 규칙 초안을 만듭니다. | `openapi/review/project-rules/analysis.md`, `openapi/review/project-rules/analysis.json`, `openapi/config/project-rules.jsonc` | `openapi/review/project-rules/analysis.md`, `openapi/review/project-rules/analysis.json` |
| 4 | `openapi/config/project-rules.jsonc` 검토 | 분석 결과가 실제 프로젝트 컨벤션과 맞는지 확인하고 `review.rulesReviewed`를 `true`로 바꿉니다. | 없음 | `openapi/config/project-rules.jsonc` |
| 5 | `npx --yes openapi-projector project` | 검토된 규칙으로 DTO/API 후보 코드를 생성합니다. | `openapi/project/summary.md`, `openapi/project/src/openapi-generated/` | `openapi/project/summary.md` |

```bash
npx --yes openapi-projector doctor --check-url
npx --yes openapi-projector refresh
npx --yes openapi-projector rules
# openapi/config/project-rules.jsonc 검토 후 review.rulesReviewed=true 설정
npx --yes openapi-projector project
```

</details>

### 4. 커밋 기준

보통 커밋할 파일:

- `openapi/README.md`
- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

보통 커밋하지 않을 재생성 산출물:

- `openapi/_internal/`
- `openapi/review/`
- `openapi/project/`

<details>
<summary>AI Agents: Detailed Workflow</summary>

## For AI Agents: Detailed Workflow

Read this workflow before modifying generated API code. The goal is not to commit generated candidate files directly. The goal is to inspect the generated candidates, adapt the project rules to the current frontend project, and then copy only the useful DTO/API code into the real application source tree.

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
- If `sourceUrl` is empty or still points to `example.com`, `doctor` and `prepare` should fail.
- The URL should be reachable with a plain local `GET` request. If the Swagger/OpenAPI endpoint requires cookies, tokens, VPN-only browser state, or custom headers, prepare a reachable OpenAPI JSON URL before running `doctor --check-url`.

If the user already knows the OpenAPI JSON URL, they can initialize with it:

```bash
npx --yes openapi-projector init --source-url https://example.com/v3/api-docs
```

### 2. Recommended Step-by-Step Flow

Run commands from the frontend project root.

```bash
npx --yes openapi-projector doctor
npx --yes openapi-projector doctor --check-url
npx --yes openapi-projector refresh
# Read openapi/review/changes/summary.md for OpenAPI changes
npx --yes openapi-projector rules
# Read openapi/review/project-rules/analysis.md
# Keep openapi/review/project-rules/analysis.json for machine-readable evidence
# Edit openapi/config/project-rules.jsonc for this project
# Set review.rulesReviewed to true after confirming the rules
npx --yes openapi-projector project
```

Command roles:

- `doctor`: validates local config, project config, source URL, and rules readiness.
- `doctor --check-url`: also verifies that the OpenAPI JSON URL is reachable.
- `refresh`: downloads OpenAPI JSON and generates review artifacts.
- `rules`: scans the frontend project and creates/updates project rule hints.
- `project`: generates candidate DTO/API files from the confirmed rules.

Shortcut:

```bash
npx --yes openapi-projector prepare
```

`prepare` runs `refresh -> rules`, then continues to `project` only after the rules are reviewed. Use the step-by-step flow when adapting this tool to a real project for the first time.

For first-time adoption, prefer the step-by-step flow over `prepare`. `rules` needs human or AI review before the generated candidates are trusted. By default, `prepare` stops after `rules` until `openapi/config/project-rules.jsonc` has `"review": { "rulesReviewed": true }`. The standalone `project` command uses the same review gate.

### 3. Repeated Runs: Review OpenAPI Changes

After every `refresh` or `prepare`, read the change summary before touching app code.

Primary files:

- `openapi/review/changes/summary.md`
- `openapi/review/changes/summary.json`
- `openapi/review/changes/history/`

`summary.md` and `summary.json` are overwritten on each run and always represent the latest comparison.
When changes are detected, timestamped `.md` and `.json` snapshots are also appended under `openapi/review/changes/history/`.

How to interpret `summary.md`:

- `Baseline`: first run or no usable previous catalog. Treat this as the initial snapshot.
- `Added`: new endpoints.
- `Removed`: endpoints that disappeared from the OpenAPI spec.
- `Contract Changed`: request/response/path/query/header contract changed. Review generated DTO/API code carefully.
- `Doc Changed`: summary/description/tag metadata changed without detected contract changes.

`Contract Changed` items include a comparison table with field-level details when both the previous and current catalogs have comparison snapshots.
Examples include query parameter additions, request body required changes, response body field type changes, and response status/media-type changes.
`Added`, `Contract Changed`, and `Doc Changed` entries also include DTO/API candidate links based on `project-rules.jsonc`; after `project` runs, those links open the generated files under `openapi/project/src/openapi-generated/...`.
If the previous catalog was created by an older version without snapshots, the first run after upgrade can only report the affected endpoint; detailed comparison starts from the next refresh.

Recommended AI behavior:

1. If this is a baseline run, run `rules`, review `project-rules.jsonc` against the real API client, set `review.rulesReviewed` to true, then run `project`.
2. If `Contract Changed` or `Removed` is non-zero, inspect affected endpoint docs under `openapi/review/docs/` before applying code.
3. If only `Doc Changed` changed, avoid unnecessary app code edits unless naming or comments must be updated.
4. If `Added` endpoints exist, generate candidates and apply only the endpoints requested by the user.
5. Do not commit `openapi/review/changes/*` by default; it is a regenerated review artifact.

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

### 8. Git Policy

When the user asks to commit the openapi-projector setup, these files are usually commit-worthy:

- `openapi/README.md`
- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

Do not commit these generated artifacts by default:

- `openapi/_internal/`
- `openapi/review/`
- `openapi/project/`

`review/` and `project/` are reproducible outputs. Commit only the real app code that you intentionally adapt from the candidates.

### 9. Files You Usually Should Not Edit Manually

- `openapi/_internal/source/openapi.json`: downloaded OpenAPI source cache.
- `openapi/review/`: review artifacts regenerated by `refresh`.
- `openapi/project/`: candidate artifacts regenerated by `project` or `prepare`.

Manual edits should usually go into:

- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- Real app source files outside `openapi/`

</details>
