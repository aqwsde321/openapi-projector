# Backend CI OpenAPI Slack Guide

이 문서는 백엔드 배포가 끝날 때마다 배포된 OpenAPI 문서를 이전 기준선과 비교하고, 변경 리포트를 Slack으로 공지하는 설정 가이드입니다.

목표는 팀 공지입니다. 배포를 차단하는 breaking change gate가 아니라, 프론트엔드/백엔드/QA가 API 계약 변경을 빠르게 확인하도록 만드는 흐름입니다.

## 전체 흐름

```text
backend deploy 완료
-> 배포된 /v3/api-docs 다운로드
-> 이전 openapi/review/catalog/endpoints.json 복원
-> npx --yes openapi-projector catalog 실행
-> openapi/changes.json 으로 변경 여부 판단
-> 변경이 있으면 openapi/changes.md 를 Slack 전송
-> 갱신된 endpoints.json 을 다음 기준선으로 저장
```

`openapi-projector`는 `catalog` 단계에서 `openapi/changes.md`와 `openapi/changes.json`을 만듭니다. Slack 공지는 이 산출물을 GitHub Actions에서 전송합니다. npm 배포나 CLI 기능 추가는 필요하지 않습니다.

## 백엔드 저장소 준비

백엔드 저장소에 `openapi/config/project.jsonc`를 추가합니다.

```jsonc
{
  "sourceUrl": "",
  "sourcePath": "openapi/_internal/source/openapi.json",
  "catalogJsonPath": "openapi/review/catalog/endpoints.json",
  "catalogMarkdownPath": "openapi/review/catalog/endpoints.md",
  "docsDir": "openapi/review/docs",
  "generatedSchemaPath": "openapi/review/generated/schema.ts",
  "projectRulesAnalysisPath": "openapi/review/project-rules/analysis.md",
  "projectRulesAnalysisJsonPath": "openapi/review/project-rules/analysis.json",
  "projectRulesPath": "openapi/config/project-rules.jsonc",
  "projectGeneratedSrcDir": "openapi/project/src/openapi-generated"
}
```

CI에서는 `sourceUrl`을 사용하지 않습니다. 배포된 Swagger JSON을 `curl`로 직접 받아 `openapi/_internal/source/openapi.json`에 저장한 뒤 `catalog`만 실행합니다. 이 방식은 인증 헤더, retry, 사설망 접근 같은 CI 조건을 workflow에서 직접 제어하기 쉽습니다.

생성물은 백엔드 main 브랜치에 커밋하지 않습니다. 필요한 기준선은 `openapi/review/catalog/endpoints.json` 하나뿐입니다.

## Baseline 브랜치

GitHub Actions runner는 이전 실행 상태를 기억하지 못하므로 기준선을 별도 브랜치에 저장합니다.

권장 브랜치:

```text
openapi-baseline
```

권장 파일 구조:

```text
dev/endpoints.json
stg/endpoints.json
prod/endpoints.json
```

처음 실행하면 이전 기준선이 없어 `openapi/changes.json`에 `baseline: true`가 기록됩니다. 이 경우 Slack 공지는 보내지 않고 기준선만 저장합니다. 두 번째 배포부터 변경이 있을 때 Slack 공지가 전송됩니다.

## GitHub Secrets

백엔드 저장소의 GitHub Secrets에 값을 추가합니다.

```text
DEV_OAS_URL=https://dev-api.example.com/v3/api-docs
STG_OAS_URL=https://stg-api.example.com/v3/api-docs
PROD_OAS_URL=https://api.example.com/v3/api-docs
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Swagger 접근에 인증이 필요하면 추가합니다.

```text
OAS_AUTH_HEADER=Authorization: Bearer ...
```

환경별로 인증 값이 다르면 `DEV_OAS_AUTH_HEADER`, `STG_OAS_AUTH_HEADER`, `PROD_OAS_AUTH_HEADER`처럼 나누고 workflow에서 맞는 값을 사용합니다.

## GitHub Actions 예제

복붙 가능한 예제는 [docs/examples/github-actions-openapi-slack.yml](examples/github-actions-openapi-slack.yml)에 있습니다.

백엔드 workflow에 붙일 때는 아래 항목만 프로젝트에 맞게 바꿉니다.

- `needs: deploy-dev`: 실제 배포 job 이름
- `if: github.ref == 'refs/heads/develop'`: dev 배포 브랜치 조건
- `environment: dev`: GitHub Environment를 쓰는 경우에만 유지
- `DEV_OAS_URL`: 배포된 OpenAPI JSON URL secret
- `baseline/dev/endpoints.json`: 환경별 baseline 경로

stg/prod도 같은 job 구조를 복사해서 환경명과 secret만 바꾸면 됩니다.

## 변경 여부 판단

Slack 전송 여부는 `openapi/changes.json`으로 판단합니다.

```js
const count =
  changes.added.length +
  changes.removed.length +
  changes.contractChanged.length +
  changes.docChanged.length;

const shouldNotify = changes.baseline !== true && count > 0;
```

`baseline: true`는 첫 실행 또는 기준선 재생성 실행입니다. 이때는 변경 공지가 아니라 기준선 저장만 수행합니다.

## Slack 메시지

초기 운영은 `openapi/changes.md` 내용을 그대로 보내는 방식으로 시작합니다. Slack 메시지 길이 제한을 넘을 수 있으므로 예제 workflow는 본문을 잘라 전송하고, 전체 파일은 artifact로 업로드합니다.

권장 제목:

```text
[DEV] OpenAPI 변경 감지: +2 / -0 / contract 1 / doc 3
```

주요 섹션:

- `Added`: 새 endpoint
- `Removed`: 삭제된 endpoint
- `Contract Changed`: request/response/parameter/schema 계약 변경
- `Doc Changed`: summary/description/tag 같은 문서성 변경

## 테스트 방법

처음에는 실제 팀 채널이 아니라 테스트 Slack 채널 webhook으로 확인합니다.

1. baseline이 없는 상태에서 workflow를 실행합니다.
   - 기대 결과: Slack 공지 없음
   - 기대 결과: `openapi-baseline` 브랜치에 `dev/endpoints.json` 생성
2. 백엔드 dev 환경에 endpoint를 하나 추가하고 배포합니다.
   - 기대 결과: Slack 공지 전송
   - 기대 결과: `Added` 섹션에 endpoint 표시
3. query parameter required 여부 또는 response DTO 필드 타입을 변경하고 배포합니다.
   - 기대 결과: `Contract Changed` 섹션에 비교 표 표시
4. summary 또는 description만 변경하고 배포합니다.
   - 기대 결과: `Doc Changed` 섹션에 표시
5. Swagger 변경 없이 workflow를 다시 실행합니다.
   - 기대 결과: Slack 공지 없음
   - 기대 결과: baseline commit 없음

## 운영 주의사항

- 배포 직후 `/v3/api-docs`가 아직 갱신되지 않았을 수 있으므로 retry를 둡니다.
- 환경별 workflow concurrency를 설정해 baseline push 충돌을 줄입니다.
- Slack 본문은 길이 제한 때문에 잘릴 수 있습니다. 전체 `openapi/changes.md`는 artifact에서 확인합니다.
- `openapi-projector` 리포트는 팀 공지용입니다. breaking/compatible 판정을 엄밀하게 해서 배포를 막는 용도는 아닙니다.
- 배포 차단이 필요해지면 별도 job에서 `oasdiff breaking` 같은 검사를 추가합니다.
