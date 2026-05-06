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
-> openapi/changes.md 를 GitHub Actions summary에 기록
-> 변경이 있으면 openapi/changes.md 요약을 Slack 전송
-> 갱신된 endpoints.json 을 다음 기준선으로 저장
```

`openapi-projector`는 `catalog` 단계에서 `openapi/changes.md`와 `openapi/changes.json`을 만듭니다. Slack 공지는 이 산출물을 GitHub Actions에서 전송합니다. npm 배포나 CLI 기능 추가는 필요하지 않습니다.

## 최소 설정

dev 환경만 기준으로 시작하면 백엔드 저장소에서 필요한 작업은 아래가 전부입니다.

1. 예제 workflow를 `.github/workflows/openapi-slack-report.yml`로 추가
2. GitHub Secrets에 아래 2개 값 추가

```text
DEV_OAS_URL=https://dev-api.example.com/v3/api-docs
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

workflow 안에서 프로젝트별로 바꿔야 하는 지점은 아래 정도입니다.

- `deploy-dev`: 실제 백엔드 dev 배포 job으로 교체하거나 기존 배포 workflow 뒤에 `openapi-change-report` job을 붙임
- `needs: deploy-dev`: 실제 배포 job 이름에 맞춤
- `if: github.ref == 'refs/heads/develop'`: dev 배포 브랜치 조건에 맞춤
- `environment: dev`: GitHub Environment를 쓰지 않으면 제거

수동 실행부터 확인할 거면 예제 그대로 `workflow_dispatch`로 먼저 돌려볼 수 있습니다.

백엔드 적용 체크리스트:

- 예제 workflow를 백엔드 저장소 `.github/workflows/openapi-slack-report.yml`에 복사
- `deploy-dev`를 실제 dev 배포 job으로 교체하거나, 기존 배포 workflow 뒤에 `openapi-change-report` job을 연결
- `needs`, branch `if`, `environment`, `concurrency` 이름을 백엔드 저장소 기준으로 수정
- GitHub Secrets에 `DEV_OAS_URL`, `SLACK_WEBHOOK_URL` 추가
- 인증이 필요하면 `OAS_AUTH_HEADER` secret 추가
- `openapi-baseline` 브랜치 push가 가능하도록 workflow `contents: write` 권한이 허용되는지 확인
- 테스트 Slack 채널 webhook으로 baseline 생성 실행과 변경 감지 실행을 한 번씩 확인

## 자동 처리되는 것

예제 workflow는 CI 안에서 `openapi/config/project.jsonc`가 없으면 빈 설정 파일을 만듭니다. 백엔드 저장소에 설정 파일을 커밋하지 않아도 됩니다.

```jsonc
{}
```

CI에서는 OpenAPI JSON 다운로드에 `sourceUrl`을 사용하지 않습니다. 배포된 Swagger JSON을 `curl`로 직접 받아 `openapi/_internal/source/openapi.json`에 저장한 뒤 `catalog`만 실행합니다. 이 방식은 인증 헤더, retry, 사설망 접근 같은 CI 조건을 workflow에서 직접 제어하기 쉽습니다.

`changes.md`의 endpoint 제목 옆에 실제 Swagger UI 링크를 붙이고 싶으면 `swaggerUiUrl`을 명시합니다. CI에서 `project.jsonc`를 `{}`로만 만들면 기본 `sourceUrl`에서 링크를 추론하지 않습니다. 예제 workflow는 repository/environment variable `DEV_SWAGGER_UI_URL`이 있으면 임시 `project.jsonc`에 이 값을 씁니다.

생성물은 백엔드 main 브랜치에 커밋하지 않습니다. 필요한 기준선은 `openapi/review/catalog/endpoints.json` 하나뿐입니다.

기준선은 `openapi-baseline` 브랜치에 저장합니다. 브랜치가 없으면 예제 workflow가 orphan branch로 자동 초기화합니다.

```text
dev/endpoints.json
```

처음 실행하면 이전 기준선이 없어 `openapi/changes.json`에 `baseline: true`가 기록됩니다. 이 경우 Slack 공지는 보내지 않고 기준선만 저장합니다. 두 번째 배포부터 변경이 있을 때 Slack 공지가 전송됩니다.

## 선택 설정

아래 항목은 필요할 때만 추가합니다.

- Swagger 접근에 인증이 필요하면 `OAS_AUTH_HEADER=Authorization: Bearer ...` secret 추가
- `changes.md`에 Swagger UI 바로가기 링크가 필요하면 `DEV_SWAGGER_UI_URL=https://dev-api.example.com/swagger-ui/index.html` repository/environment variable 추가
- stg/prod도 운영하면 `STG_OAS_URL`, `PROD_OAS_URL`처럼 환경별 secret을 추가하고 workflow job 복사
- 경로를 바꾸고 싶으면 백엔드 저장소에 `openapi/config/project.jsonc` 커밋
- 배포 직후 이전 버전 Swagger가 응답할 수 있으면 `/healthz` 같은 배포 확인 step 추가

경로 override가 필요한 경우의 `project.jsonc` 예시:

```jsonc
{
  "swaggerUiUrl": "https://dev-api.example.com/swagger-ui/index.html",
  "sourcePath": "openapi/_internal/source/openapi.json",
  "catalogJsonPath": "openapi/review/catalog/endpoints.json",
  "catalogMarkdownPath": "openapi/review/catalog/endpoints.md"
}
```

## GitHub Actions 예제

복붙 가능한 예제는 [docs/examples/github-actions-openapi-slack.yml](examples/github-actions-openapi-slack.yml)에 있습니다.

백엔드 workflow에 붙일 때는 위의 프로젝트별 수정 지점만 확인합니다.

stg/prod도 같은 job 구조를 복사해서 환경명, baseline path, secret만 바꾸면 됩니다.

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

초기 운영은 `openapi/changes.md` 내용을 그대로 보내는 방식으로 시작합니다. 예제 workflow는 Slack 메시지 제목과 상세 링크 문구를 고려해 본문을 약 2,500자에서 자르고 `... (Slack 본문 길이 제한으로 일부만 표시됨)` 문구를 붙입니다. 전체 `changes.md`는 GitHub Actions summary에 남깁니다.

권장 제목:

```text
[DEV] OpenAPI 변경 감지
```

변경 건수는 `changes.md` 본문의 `Change Summary`에 표시됩니다.

주요 섹션:

- `Added`: 새 endpoint
- `Removed`: 삭제된 endpoint
- `Contract Changed`: request/response/parameter/schema 계약 변경
- `Doc Changed`: summary/description/tag 같은 문서성 변경

Slack 전송 step은 baseline 갱신보다 먼저 실행합니다. 변경이 감지됐는데 `SLACK_WEBHOOK_URL`이 없거나 Slack webhook 호출이 실패하면 job을 실패시키고 baseline을 갱신하지 않습니다. 이렇게 해야 알림 실패 상태에서 기준선만 앞으로 밀려 다음 실행에서 같은 변경을 놓치는 일을 피할 수 있습니다.

## 테스트 방법

처음에는 실제 팀 채널이 아니라 테스트 Slack 채널 webhook으로 확인합니다.

1. baseline이 없는 상태에서 workflow를 실행합니다.
   - 기대 결과: Slack 공지 없음
   - 기대 결과: `openapi-baseline` 브랜치에 `dev/endpoints.json` 생성
2. 백엔드 dev 환경에 endpoint를 하나 추가하고 배포합니다.
   - 기대 결과: Slack 공지 전송
   - 기대 결과: GitHub Actions summary에서 전체 변경 리포트 확인 가능
   - 기대 결과: `Added` 섹션에 endpoint 표시
3. query parameter required 여부 또는 response DTO 필드 타입을 변경하고 배포합니다.
   - 기대 결과: `Contract Changed` 섹션에 이모지가 붙은 한 줄 변경 목록 표시
4. summary 또는 description만 변경하고 배포합니다.
   - 기대 결과: `Doc Changed` 섹션에 표시
5. Swagger 변경 없이 workflow를 다시 실행합니다.
   - 기대 결과: Slack 공지 없음
   - 기대 결과: baseline commit 없음

## 운영 주의사항

- 배포 직후 `/v3/api-docs`가 아직 갱신되지 않았을 수 있으므로 retry를 둡니다.
- `/healthz`처럼 배포 커밋을 확인할 수 있는 endpoint가 있다면, `/v3/api-docs` 다운로드 전에 해당 커밋이 배포됐는지 확인하는 단계를 추가합니다.
- 환경별 workflow concurrency를 설정해 baseline push 충돌을 줄입니다.
- Slack 본문은 길이 제한 때문에 잘릴 수 있습니다. 전체 `openapi/changes.md`는 GitHub Actions summary에서 확인합니다.
- GitHub Actions summary는 step당 1MiB 제한이 있으므로, 리포트가 그보다 커지면 별도 artifact 보관을 다시 검토합니다.
- `openapi-projector` 리포트는 팀 공지용입니다. breaking/compatible 판정을 엄밀하게 해서 배포를 막는 용도는 아닙니다.
- 배포 차단이 필요해지면 별도 job에서 `oasdiff breaking` 같은 검사를 추가합니다.
