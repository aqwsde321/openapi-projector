# Maintainer Notes

이 문서는 이 저장소 자체를 수정하는 사람을 위한 문서입니다.

## 역할

이 저장소는 서비스 프로젝트 안의 `openapi/` 작업 폴더를 생성하고 갱신하는 CLI 원본입니다.

즉:

- 이 저장소 자체는 보통 결과물을 담지 않습니다.
- 결과물은 대상 프로젝트 안의 `openapi/`에 생성됩니다.

## 핵심 엔트리포인트

- CLI 진입점: `bin/openapi-tool.mjs`
- 명령 라우팅: `src/cli.mjs`
- 공용 유틸: `src/core/openapi-utils.mjs`
- 명령 구현: `src/commands/*.mjs`
- 기본 설정값: `config/defaults.jsonc`
- bootstrap 템플릿: `templates/project.jsonc`, `templates/project-rules.jsonc`

## 현재 구현 경계

- `init`
  - 대상 프로젝트에 `openapi/` bootstrap 생성
- `refresh`
  - `download + catalog + generate`
- `rules`
  - 대상 프로젝트의 `src/entities` 등을 분석해 규칙 문서/scaffold 생성
- `project`
  - `project-rules.jsonc` 기준으로 project 후보 코드 생성
- `apply`
  - 후보 코드를 실제 `src`로 반영

## 개발 시 확인할 것

### 1. 현재 repo 호환성

이 저장소는 현재 개발 중인 repo 안에서도 동작해야 합니다.

즉 최소한 아래는 계속 통과해야 합니다.

```bash
node openapi-tool/bin/openapi-tool.mjs help
node openapi-tool/bin/openapi-tool.mjs catalog
node openapi-tool/bin/openapi-tool.mjs generate
node openapi-tool/bin/openapi-tool.mjs rules
node openapi-tool/bin/openapi-tool.mjs project
node openapi-tool/bin/openapi-tool.mjs apply
```

### 2. bootstrap 시나리오

새 빈 디렉터리에서 `init`이 실제로 `openapi/`를 만들어야 합니다.

예:

```bash
cd /tmp/smoke-project
node /path/to/openapi-workflow/bin/openapi-tool.mjs init
```

### 3. config discovery

현재는 아래 순서를 지원합니다.

1. `openapi.config.jsonc`
2. `openapi/config/project.jsonc`
3. `config/project.jsonc`

이 순서는 README와 항상 맞아야 합니다.

## 문서 원칙

- root `README.md`
  - 대상 프로젝트 사용자가 먼저 읽는 문서
- `docs/01-concepts.md`
  - 도구 vs 작업 폴더 개념 설명
- `docs/02-target-project-usage.md`
  - 실제 적용 절차
- `docs/03-maintainer-notes.md`
  - 도구 저장소 수정용 문서
- `docs/04-config-reference.md`
  - 설정 필드 설명
- `docs/05-product-plan.md`
  - 제품 목표, 범위, 비목표
- `docs/06-requirements-spec.md`
  - 기능 요구사항과 완료 기준
- `docs/07-gap-analysis.md`
  - 현재 구현 대비 요구사항 갭 분석
- `docs/08-external-report-review.md`
  - 외부 설계 보고서 검토 및 채택 방향
- `docs/09-external-report-original.md`
  - 외부 설계 보고서 원문 보관

사용자 문서와 개발자 문서를 다시 섞지 않는 것이 중요합니다.
