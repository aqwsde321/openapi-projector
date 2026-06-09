---
name: openapi-projector
description: Use when the user asks how to use $openapi-projector, asks to run openapi-projector, prepare Swagger/OpenAPI changes, review project rules, or apply a generated endpoint DTO/API/hook candidate to a frontend project. Trigger on requests like "$openapi-projector 사용법", "$openapi-projector POST /login 적용", "openapi-projector prepare", "Swagger 변경 확인", or "엔드포인트 적용".
---

# openapi-projector

Use `openapi-projector` to review Swagger/OpenAPI changes and apply selected generated candidates to a frontend project without breaking the project's existing API conventions.

## Usage Help

When the user asks how to use `$openapi-projector`, answer with concise examples:

```text
$openapi-projector prepare
$openapi-projector POST /login 적용
$openapi-projector 룰 새로 적용하고 POST /login 적용
```

Explain that an endpoint apply request runs prepare/rules checks before app code edits, then applies the selected endpoint's DTO + API wrapper by default. Re-review rules only when the user asks to refresh rules, prepare stops at the rules gate, or current rules do not match the real project code.

## Project Root

Work from the frontend app root. The frontend project root is the app directory containing `package.json`.

If the current directory is not clearly the frontend app root, inspect nearby files and ask only when multiple plausible app roots exist.

## Project Guide

At the start of a new task, check for `openapi/README.md` in the frontend project root.

- If it exists, read it before running commands or applying generated code.
- If it was already read in the same conversation after the latest `init`, `update`, or README change, do not reread it unless needed.
- If it does not exist, run `npx --yes openapi-projector@latest init` from the frontend project root, then read the generated `openapi/README.md`.
- Never rerun `init` in an already initialized project. Use `update` only when the user wants the existing openapi workspace refreshed to the latest CLI guidance/defaults.

## Updates

Do not automatically replace installed skills or workspace guidance.

- CLI commands already use `npx --yes openapi-projector@latest`, so normal command execution uses the latest published CLI.
- If the installed Codex skill should be updated, ask the user before running `npx --yes openapi-projector@latest install-skill --yes --force`. Explain that it replaces only the installed Codex skill.
- If CLI output recommends `update` or `upgrade-docs`, ask the user before running it. Explain whether it updates the existing `openapi/` workspace metadata/docs/defaults or only the generated README.
- If a command cannot continue without `update`, ask first; after approval, run `npx --yes openapi-projector@latest update` and continue.

## Prepare And Rules

Run commands from the frontend project root.

1. Run `npx --yes openapi-projector@latest doctor --check-url`.
2. Run `npx --yes openapi-projector@latest prepare`.
3. Read `openapi/changes.md`.
4. If `prepare` stops at the rules review gate, read:
   - `openapi/review/project-rules/analysis.md`
   - `openapi/review/project-rules/analysis.json`
   - `openapi/config/project-rules.jsonc`
5. Compare the generated rules with the real project code: API client import path, import kind, request call style, response wrapper behavior, file layout, and React Query usage.
6. If rules are clearly wrong, update `openapi/config/project-rules.jsonc` to match the project. Keep changes minimal and evidence-based.
7. Set `review.rulesReviewed=true` only after verifying the rules against real project code.
8. Rerun `npx --yes openapi-projector@latest prepare`.

Do not change rules based on assumptions. If evidence is insufficient, summarize the uncertainty and ask the user.

## Applying An Endpoint

When the user says an endpoint should be applied, accept method/path or `operationId`.

Examples:

```text
$openapi-projector POST /api/users 적용
$openapi-projector getUserById 적용
$openapi-projector /api/orders/{id} 적용
```

Default apply behavior:

- Apply the request/response DTOs needed by the selected endpoint.
- Apply the API wrapper using the existing project API client convention.
- Apply React Query hooks only when `project-rules.jsonc` enables hooks and the project already uses that hook pattern.
- Do not ask the user to choose DTO/API/hook scope unless the user explicitly wants a narrower scope or the project convention is ambiguous.
- If the user says `DTO만`, `API만`, `hook 제외`, or similar, obey that narrower scope.

Before editing app code:

1. Run the prepare flow before applying the endpoint so the latest Swagger/OpenAPI is fetched and candidates are regenerated. If prepare already succeeded in this conversation after the latest source/rules change, reuse that result.
2. If prepare fails because the OpenAPI URL/backend/auth/network is unavailable, use the last successful `openapi/project/` candidates only when they already exist, and tell the user that the apply is based on stale candidates. If no previous candidates exist, stop and report the failure.
3. Resolve the selected endpoint exactly. If multiple candidates match, ask the user to choose.
4. Read the endpoint's generated candidate files under `openapi/project/src/openapi-generated/`.
5. Inspect nearby real app code for the same domain/module to learn DTO naming, API wrapper style, exports, URL constants, response unwraps, error handling, and hook/query-key conventions.
6. Choose the target app code path from existing project structure. Ask only if no defensible target path exists.

Implementation rules:

- Do not blindly copy generated `.api.ts` files.
- Adapt candidates to existing project conventions.
- Apply only the selected endpoint unless the user asks for more.
- Preserve existing user edits and unrelated files.
- Keep changes surgical.

## Verification

After applying code, run the narrowest relevant project checks available, such as typecheck, lint, unit tests, or focused tests for the touched module.

If checks are unavailable or fail for unrelated existing reasons, report that clearly with the exact command and observed result.
