# Maintainer Notes

이 문서는 이 저장소 자체를 수정하는 사람을 위한 문서입니다.

## 역할

이 저장소는 서비스 프로젝트 안의 `openapi/` 작업 폴더를 생성하고 갱신하는 CLI 원본입니다.

즉:

- 이 저장소 자체는 보통 결과물을 담지 않습니다.
- 결과물은 대상 프로젝트 안의 `openapi/`에 생성됩니다.
- 배포 빌드 단계는 없고, 로컬 사용은 보통 `npm install && npm link`로 CLI bin을 연결합니다.

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
  - 대상 프로젝트의 `src/entities`를 우선 분석하고, 없으면 `src` fallback 으로 규칙 문서/scaffold 생성
- `project`
  - `project-rules.jsonc` 기준으로 `schema.ts + 태그 폴더 내부 엔드포인트별 DTO/API` 후보 코드 생성
- `doctor`
  - 로컬 설정, 대상 프로젝트 config, 다운로드된 OpenAPI JSON, project-rules 준비 상태 점검
- `prepare`
  - `init` 필요 시 생성 후 `refresh -> rules -> project` 원샷 실행

## 개발 시 확인할 것

### 1. 현재 repo 검증

도구 저장소 루트는 기본 대상 프로젝트가 아닙니다. repo 자체 검증은 아래를 기본으로 합니다.

```bash
node ./bin/openapi-tool.mjs help
npm test
```

### 2. bootstrap 시나리오

새 빈 프론트엔드 프로젝트 디렉터리에서 `init`이 로컬 설정과 `openapi/`를 만들고 `doctor`가 통과해야 합니다.

예:

```bash
cd /tmp/smoke-project
node /path/to/openapi-projector/bin/openapi-tool.mjs init --source-url <openapi-json-url>
node /path/to/openapi-projector/bin/openapi-tool.mjs doctor
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

사용자 문서와 개발자 문서를 다시 섞지 않는 것이 중요합니다.
