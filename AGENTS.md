# AGENTS.md

## Communication

- 답변은 한국어로 한다.

## Project-Specific Instructions

전역 AGENTS.md 지침에 더해, 이 저장소에서는 아래 규칙을 반드시 따른다.

## Backward Compatibility

이 프로젝트는 npm/npx로 배포되는 CLI이다. 새 개선은 기존 사용자가 최신 버전을 실행해도 기존 흐름이 깨지지 않아야 한다.

- 기존 공개 bin 이름의 의미를 바꾸지 않는다.
  - `openapi-projector`
  - `openapi-tool`
- 기존 공개 명령어의 의미를 바꾸지 않는다.
  - `help`, `init`, `download`, `catalog`, `generate`, `rules`, `project`, `refresh`, `doctor`, `prepare`, `update`, `upgrade-docs`, `version`, `--version`
- 기존 공개 옵션의 의미를 바꾸지 않는다.
  - 공통: `--project-root`
  - `init`: `--source-url`, `--no-input`, `--force`
  - `doctor`: `--check-url`
- 기존 설정 탐색 순서를 깨지 않는다.
  1. `openapi.config.jsonc`
  2. `openapi/config/project.jsonc`
  3. `config/project.jsonc`
- 기존 local config 호환성을 유지한다.
  - `.openapi-projector.local.jsonc`
  - `.openapi-tool.local.jsonc`
- 기존 생성/작업 파일 구조가 그대로 동작해야 한다.
  - `openapi/README.md`
  - `openapi/config/project.jsonc`
  - `openapi/config/project-rules.jsonc`
  - `openapi/review/**`
  - `openapi/changes/**`
  - `openapi/project/**`
- `prepare`의 review gate를 우회하지 않는다.
  - `review.rulesReviewed !== true`이면 `project` 후보 생성까지 진행하지 않는 기존 안전 흐름을 유지한다.
- `update`는 기존 작업공간을 안전하게 갱신하는 명령이다.
  - review history, generated candidates, 사용자가 수정한 project config를 삭제하거나 덮어쓰지 않는다.
- 새 기능은 기본적으로 additive하게 추가한다.
  - 기존 명령의 기본 동작을 바꾸지 않는다.
  - 새 동작이 필요하면 새 옵션, 새 config 필드, 또는 명시적 opt-in을 우선 고려한다.
  - 기본 동작 변경이 필요하면 구현 전에 사용자에게 호환성 영향, 대안, migration 방안을 먼저 제시한다.
- scaffold와 문서 템플릿 변경은 사용자-visible 변경이다.
  - `templates/project.jsonc`, `templates/project-rules.jsonc`, `templates/project-readme.md`, `config/defaults.jsonc` 변경 시 기존 init/update 결과가 의도치 않게 바뀌지 않았는지 확인한다.

## Compatibility Validation

기능 변경에는 변경 범위에 맞는 호환성 검증을 포함한다. CLI 동작, 설정, 템플릿, 생성물에 닿는 변경이면 최소한 아래를 확인한다.

- `pnpm test`
- `node ./bin/openapi-tool.mjs help`
- 기존 fixture 기반 흐름:
  - `init --source-url <fixture-or-local-openapi-json> --no-input`
  - `refresh` 또는 `generate`
  - `rules`
  - `review.rulesReviewed`를 true로 둔 뒤 `project` 또는 `prepare`
- 기존 CLI 옵션을 쓰는 테스트:
  - `--project-root`
  - `init --source-url`
  - `init --no-input`
  - `init --force`
  - `doctor --check-url`
- 기존 scaffold/README/template 생성 결과가 의도치 않게 바뀌지 않았는지 확인한다.
- 배포 영향이 있는 변경이면 `npm pack --dry-run`까지 확인한다.

기존 사용자가 `npx --yes openapi-projector@latest <기존 명령>`을 실행했을 때 에러가 나지 않아야 한다. 호환성을 깨는 변경이 불가피하면 구현 전에 멈추고 사용자에게 알린다.

## Documentation Boundaries

- root `README.md`는 대상 프로젝트 사용자를 위한 문서로 유지한다.
- `docs/03-maintainer-notes.md`는 이 CLI 저장소를 수정하는 유지보수자 문서로 유지한다.
- 사용자 문서와 유지보수자 문서를 섞지 않는다.
