# openapi-workflow

이 저장소는 서비스 프로젝트 안에 `openapi/` 작업 폴더를 만들어 주는 CLI 도구 원본입니다.

가장 중요한 기준은 하나입니다.

- 이 저장소는 `openapi/` 결과물을 담는 곳이 아닙니다.
- `openapi/`는 **적용 대상 프로젝트 안에 생성되는 작업 폴더**입니다.

즉 이 저장소는 “도구”, 각 서비스 프로젝트의 `openapi/`는 “도구가 만드는 작업 공간”입니다.

## 먼저 읽을 문서

- 대상 프로젝트에 적용하는 방법: [docs/02-target-project-usage.md](docs/02-target-project-usage.md)
- `openapi-tool`과 `openapi/`의 차이: [docs/01-concepts.md](docs/01-concepts.md)
- 제품 기획과 범위: [docs/05-product-plan.md](docs/05-product-plan.md)
- 기능 요구사항: [docs/06-requirements-spec.md](docs/06-requirements-spec.md)
- 현재 구현 갭 분석: [docs/07-gap-analysis.md](docs/07-gap-analysis.md)
- 외부 설계 보고서 채택 정리: [docs/08-external-report-review.md](docs/08-external-report-review.md)
- 외부 설계 보고서 원문 보관: [docs/09-external-report-original.md](docs/09-external-report-original.md)
- 설정 파일 설명: [docs/04-config-reference.md](docs/04-config-reference.md)
- 이 도구 자체를 수정하는 방법: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)

## 가장 짧은 사용 예시

대상 프로젝트가 `/path/to/service-app` 이고, 이 도구 저장소가 `/path/to/openapi-workflow` 에 있다고 가정합니다.

```bash
cd /path/to/service-app
node /path/to/openapi-workflow/bin/openapi-tool.mjs init
```

위 명령을 실행하면 대상 프로젝트 안에 아래가 생깁니다.

```text
openapi/
  .gitignore
  config/
    project.jsonc
    project-rules.jsonc
```

그 다음 순서는 이렇습니다.

```bash
node /path/to/openapi-workflow/bin/openapi-tool.mjs refresh
node /path/to/openapi-workflow/bin/openapi-tool.mjs rules
node /path/to/openapi-workflow/bin/openapi-tool.mjs project
node /path/to/openapi-workflow/bin/openapi-tool.mjs apply
```

`apply` 전까지는 실제 앱 코드가 아니라 대상 프로젝트의 `openapi/` 안에서만 작업합니다.

## 명령

- `init`: 대상 프로젝트 안에 `openapi/` bootstrap 생성
- `download`: `sourceUrl` 기준으로 OpenAPI 원본 다운로드
- `catalog`: 전체 endpoint 목록과 변경 요약 생성
- `generate`: review용 문서와 raw endpoint helper 생성
- `rules`: 현재 프로젝트 구조를 분석하고 규칙 문서/scaffold 생성
- `project`: `project-rules.jsonc`를 읽어 프로젝트 후보 코드 생성
- `apply`: 후보 코드를 실제 `src`로 반영
- `refresh`: `download + catalog + generate`

## 현재 상태

- standalone CLI prototype 수준까지 정리됨
- 대상 프로젝트 bootstrap 가능
- `openapi/*` 기본 구조를 전제로 동작
- config schema validation, init 옵션 일반화는 아직 미완성
