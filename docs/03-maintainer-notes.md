# Maintainer Notes

이 문서는 이 저장소 자체를 수정하는 사람을 위한 문서입니다.

## 역할

이 저장소는 서비스 프로젝트 안의 `openapi/` 작업 폴더를 생성하고 갱신하는 CLI 원본입니다.

즉:

- 이 저장소 자체는 보통 결과물을 담지 않습니다.
- 결과물은 대상 프로젝트 안의 `openapi/`에 생성됩니다.
- 배포 빌드 단계는 없고, 사용자는 보통 `npx --yes openapi-projector ...`로 npm 패키지를 바로 실행합니다.
- 저장소 내부 개발/검증은 `pnpm install` 후 `node ./bin/openapi-tool.mjs ...` 또는 `pnpm test`로 진행합니다.

## 핵심 엔트리포인트

- CLI 진입점: `bin/openapi-tool.mjs`
- 명령 라우팅: `src/cli.mjs`
- 공용 유틸: `src/core/openapi-utils.mjs`
- 명령 구현: `src/commands/*.mjs`
- 기본 설정값: `config/defaults.jsonc`
- bootstrap 템플릿: `templates/project.jsonc`, `templates/project-rules.jsonc`, `templates/project-readme.md`

## 현재 구현 경계

- `init`
  - 대상 프로젝트에 `openapi/` bootstrap과 사용자/AI용 `openapi/README.md` 생성
  - 기존 `openapi/config/project.jsonc`가 있으면 실패
  - `--force` 지정 시 bootstrap 템플릿 파일을 다시 씀
- `refresh`
  - `download + catalog + generate`
- `rules`
  - 대상 프로젝트의 `src` 전체를 분석하고, source section 통계와 함께 규칙 문서/scaffold 생성
- `project`
  - `project-rules.jsonc` 기준으로 `schema.ts + 태그 폴더 내부 엔드포인트별 DTO/API` 후보 코드 생성
  - 명시적 `2xx`/`2XX` 성공 응답이 없는 endpoint는 생성하지 않고 summary/manifest에 skip 사유를 남김
  - 생성 API wrapper는 path parameter를 `encodeURIComponent`로 URL encoding 함
- `doctor`
  - 로컬 설정, 대상 프로젝트 config, 다운로드된 OpenAPI JSON, project-rules 준비 상태 점검
- `prepare`
  - `init` 필요 시 생성 후 `refresh -> rules`를 실행하고, `review.rulesReviewed`가 true인 rules에서만 `project`까지 실행

## 개발 시 확인할 것

### 1. 현재 repo 검증

도구 저장소 루트는 기본 대상 프로젝트가 아닙니다. repo 자체 검증은 아래를 기본으로 합니다.

```bash
node ./bin/openapi-tool.mjs help
pnpm test
npm pack --dry-run
```

회귀 테스트를 추가할 때는 최소한 아래 케이스를 고려합니다.

- JSONC 주석과 trailing comma
- OpenAPI 3.1 `type: ["...", "null"]`
- 명시적 성공 응답이 없는 endpoint skip
- path parameter URL encoding

### 2. npm 배포

배포는 GitHub Actions의 npm Trusted Publishing을 기준으로 자동화합니다. npm 패키지 설정에서 Trusted Publisher를 아래 값으로 등록해야 합니다.

| 항목 | 값 |
| --- | --- |
| Publisher | GitHub Actions |
| Organization or user | `aqwsde321` |
| Repository | `openapi-projector` |
| Workflow filename | `publish.yml` |
| Environment name | 비워둠 |

배포 절차:

```bash
# package.json version을 먼저 올리고 커밋
git tag v0.1.1
git push origin main --tags
```

`.github/workflows/publish.yml`은 태그의 `v`를 제외한 값과 `package.json`의 `version`이 같을 때만 `pnpm test`, `npm pack --dry-run`, `npm publish`를 실행합니다.

### 3. bootstrap 시나리오

새 빈 프론트엔드 프로젝트 디렉터리에서 `init`이 로컬 설정과 `openapi/`를 만들고, `sourceUrl` 설정 후 `refresh -> rules`가 review gate 앞까지 정상 진행해야 합니다. `project-rules.jsonc` 검토 전에는 `doctor`가 unreviewed rules를 FAIL로 보고하는 것이 기대 동작입니다.

예:

```bash
cd /tmp/smoke-project
node <openapi-projector 저장소 루트>/bin/openapi-tool.mjs init
# openapi/config/project.jsonc 의 sourceUrl 을 실제 OpenAPI JSON URL로 설정
node <openapi-projector 저장소 루트>/bin/openapi-tool.mjs doctor
node <openapi-projector 저장소 루트>/bin/openapi-tool.mjs refresh
node <openapi-projector 저장소 루트>/bin/openapi-tool.mjs rules
# openapi/review/project-rules/analysis.md 와 실제 API client 를 확인
# openapi/config/project-rules.jsonc 의 review.rulesReviewed 를 true 로 설정
node <openapi-projector 저장소 루트>/bin/openapi-tool.mjs doctor
node <openapi-projector 저장소 루트>/bin/openapi-tool.mjs project
```

기존 bootstrap 초기화가 필요할 때만 아래처럼 실행합니다.

```bash
node <openapi-projector 저장소 루트>/bin/openapi-tool.mjs init --force
```

### 4. config discovery

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
