# OpenAPI CI 변경 공지 TODO

## 목적

백엔드 배포가 끝날 때마다 배포된 OpenAPI 문서를 이전 기준선과 비교하고, 팀이 바로 확인할 수 있는 변경 리포트를 Slack으로 공지한다.

이 작업은 팀 공지용이다. 배포 차단용 breaking change gate가 아니라, 프론트/백엔드/QA가 API 계약 변경을 빠르게 인지하도록 만드는 것이 우선이다.

## 기본 방향

- `oasdiff` 대신 `openapi-projector catalog`가 생성하는 `openapi/changes.md`를 Slack 공지 본문으로 사용한다.
- 백엔드 CI/CD의 배포 완료 이후 job으로 실행한다.
- npm 배포는 하지 않는다. 현재 CLI 기능으로 가능한 운영 가이드를 먼저 정리하고, 필요한 개선은 후속 작업으로 분리한다.
- `prepare`나 `project`는 실행하지 않는다. 팀 공지용에는 `catalog` 결과면 충분하다.
- 이전 기준선은 `openapi/review/catalog/endpoints.json` 하나만 저장한다.

## 권장 실행 흐름

```text
backend deploy 완료
-> 배포된 /v3/api-docs 다운로드
-> 이전 openapi/review/catalog/endpoints.json 복원
-> npx --yes openapi-projector catalog 실행
-> openapi/changes.json 으로 변경 여부 판단
-> 변경이 있으면 openapi/changes.md 를 Slack 전송
-> 갱신된 endpoints.json 을 다음 기준선으로 저장
```

## 기준선 저장 방식

GitHub Actions runner는 매번 새 환경에서 실행되므로 이전 비교 기준을 외부에 저장해야 한다.

우선순위:

1. 별도 브랜치 `openapi-baseline`에 환경별 catalog 저장
2. S3 같은 object storage에 환경별 catalog 저장
3. GitHub Actions artifact/cache 사용

초기 구현은 별도 브랜치 방식을 권장한다. 구조는 단순하게 유지한다.

```text
openapi-baseline
├── dev/endpoints.json
├── stg/endpoints.json
└── prod/endpoints.json
```

첫 실행에서는 이전 기준선이 없으므로 `baseline: true`가 생성된다. 이때는 Slack 공지를 보내지 않고 기준선만 저장한다. 두 번째 배포부터 변경 공지가 나가는 것이 정상 동작이다.

## 백엔드 저장소에 필요한 설정

백엔드 저장소에는 최소한의 `openapi/config/project.jsonc`만 둔다.

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

`sourceUrl`은 비워둬도 된다. CI에서 `curl`로 배포된 Swagger JSON을 직접 받아 `sourcePath`에 저장한 뒤 `catalog`만 실행하면 된다. 이 방식이 인증 헤더, 사설망, retry 처리에 유리하다.

## GitHub Actions TODO

- [ ] 백엔드 배포 workflow에서 배포 완료 job 뒤에 `openapi-change-report` job 추가
- [ ] `openapi-baseline` 브랜치 생성
- [ ] 환경별 baseline 경로 결정: `dev`, `stg`, `prod`
- [ ] GitHub Secrets 추가
  - `DEV_OAS_URL`
  - `STG_OAS_URL`
  - `PROD_OAS_URL`
  - `SLACK_WEBHOOK_URL`
  - 인증이 필요하면 `OAS_AUTH_HEADER`
- [ ] 이전 `endpoints.json`을 `openapi/review/catalog/endpoints.json`으로 복원
- [ ] 배포된 `/v3/api-docs`를 `openapi/_internal/source/openapi.json`으로 다운로드
- [ ] `npx --yes openapi-projector catalog` 실행
- [ ] `openapi/changes.json`에서 변경 여부 판단
- [ ] 변경이 있으면 `openapi/changes.md`를 Slack으로 전송
- [ ] 갱신된 `openapi/review/catalog/endpoints.json`을 baseline 브랜치에 커밋
- [ ] 첫 실행 또는 baseline 생성 실행에서는 Slack 공지를 생략

## 변경 여부 판단

`openapi/changes.json`의 아래 값들을 합산한다.

```js
const count =
  changes.added.length +
  changes.removed.length +
  changes.contractChanged.length +
  changes.docChanged.length;
```

Slack 전송 조건:

```text
changes.baseline !== true && count > 0
```

## Slack 메시지 방향

초기 버전은 단순하게 `openapi/changes.md`를 그대로 보낸다.

주의할 점:

- Slack 메시지 길이 제한 때문에 본문은 일정 길이에서 자른다.
- 전체 리포트는 GitHub Actions artifact로 업로드하거나 job summary에 남기는 방식을 추가할 수 있다.
- `Contract Changed`와 `Removed`가 있으면 제목에 더 강하게 표시한다.

예시 제목:

```text
[DEV] OpenAPI 변경 감지: +2 / -0 / contract 1 / doc 3
```

## 검증 TODO

- [ ] baseline이 없을 때 Slack 공지가 나가지 않는지 확인
- [ ] endpoint 추가가 `Added`로 공지되는지 확인
- [ ] endpoint 삭제가 `Removed`로 공지되는지 확인
- [ ] query parameter 추가/삭제가 `Contract Changed` 표로 보이는지 확인
- [ ] response DTO 필드 타입 변경이 `Contract Changed` 표로 보이는지 확인
- [ ] summary/description 변경이 `Doc Changed`로 분리되는지 확인
- [ ] 변경이 없을 때 Slack 공지가 나가지 않는지 확인
- [ ] baseline 브랜치 push 충돌 시 재실행 전략 확인

## 운영 리스크

- baseline 브랜치에 동시에 여러 배포가 push하면 충돌할 수 있다. 환경별 workflow concurrency를 설정한다.
- 배포 직후 `/v3/api-docs`가 아직 갱신되지 않았을 수 있다. retry 또는 readiness check가 필요하다.
- 인증이 필요한 Swagger는 `download` 명령보다 CI의 `curl` 다운로드가 안전하다.
- `openapi-projector`는 팀 공지용 비교에 맞춰져 있고, breaking/compatible 판정을 엄밀하게 하지 않는다.
- 배포 차단이 필요해지면 별도 job에서 `oasdiff breaking`을 보조로 추가한다.

## 후속 개선 후보

- `openapi-projector notify` 같은 CI 전용 명령 추가
- `changes.md`를 Slack Block Kit에 맞게 요약하는 formatter 추가
- `Contract Changed`와 `Removed`만 별도 강조하는 Slack payload 생성
- baseline 저장소를 git branch 외 S3/GCS로 선택할 수 있게 가이드 추가
- GitHub Actions 예제 workflow를 `docs/examples/`에 추가
