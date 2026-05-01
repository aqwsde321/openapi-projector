# openapi-projector

Swagger/OpenAPI 변경점을 이전 스냅샷과 비교하고, 필요한 endpoint만 프론트엔드 프로젝트 컨벤션에 맞는 DTO/API 후보 코드로 변환하는 review-first CLI입니다.

앱 `src/`에 바로 쓰지 않고 프론트엔드 프로젝트 안의 `openapi/` 작업 공간에 변경 비교 문서와 검토용 후보 코드를 만든 뒤, 필요한 endpoint 코드만 실제 앱에 반영합니다.

## 왜 쓰나요

- Swagger/OpenAPI 변경점을 `openapi/changes.md`에서 먼저 확인합니다.
- endpoint 추가/삭제, request/response/parameter 계약 변경, 문서성 변경을 구분해서 봅니다.
- 기존 프론트엔드 API client, import 경로, request call style을 분석해 후보 코드를 만듭니다.
- DTO/API 후보는 변경된 endpoint 단위로 실제 앱 코드에 골라 반영하기 쉽습니다.
- `openapi/review/`와 `openapi/project/`는 재생성 가능한 검토 산출물이므로 앱 코드와 분리됩니다.

## 빠른 시작

프론트엔드 프로젝트 루트에서 실행합니다.

```bash
npx --yes openapi-projector@latest init
```

`init`은 기본 OpenAPI JSON URL을 보여주고, 터미널에서 실행 중이면 바꿀 URL을 입력받습니다. 입력한 URL 검증이 실패하면 같은 서버의 대표 OpenAPI JSON 경로를 자동으로 확인하고, 그래도 실패하면 다시 입력하게 합니다. 백엔드가 아직 떠 있지 않거나 VPN/인증 때문에 CLI에서 접근할 수 없으면 `skip`을 입력해 마지막 URL을 그대로 저장할 수 있습니다.

CI나 스크립트에서 프롬프트 없이 실행하려면 `sourceUrl`을 명시합니다.

```bash
npx --yes openapi-projector@latest init --source-url "http://localhost:8080/v3/api-docs"
```

## Swagger 변경 비교

가장 먼저 보는 산출물은 `openapi/changes.md`입니다.

```bash
npx --yes openapi-projector@latest refresh
```

`refresh`는 OpenAPI JSON을 내려받고 이전 endpoint catalog와 비교합니다. 최신 비교 결과는 `openapi/changes.md`와 `openapi/changes.json`에 쓰고, 변경이 있으면 시점별 스냅샷을 `openapi/review/changes/history/`에 누적합니다.

현재 생성되는 비교 문서 위치:

```text
openapi/
  changes.md                  # 사람이 먼저 여는 최신 Swagger 변경 비교
  changes.json                # 최신 변경 비교 JSON
  review/
    changes/                  # Swagger 이전/현재 비교 결과
      history/                # 변경 감지 시점별 누적 스냅샷
        <timestamp>.md
        <timestamp>.json
      oasdiff/                # 선택적 oasdiff 호환성 리포트
    catalog/
      endpoints.json          # 다음 refresh 비교 기준
      endpoints.md            # 전체 endpoint 목록
```

비교 문서에서 확인하는 항목:

| 구분 | 의미 |
| --- | --- |
| `Added` | 새 endpoint가 추가됨 |
| `Removed` | 기존 endpoint가 삭제됨 |
| `Contract Changed` | request body, response body, path/query/header parameter 계약이 바뀜 |
| `Doc Changed` | summary, description, tag 같은 문서성 정보가 바뀜 |

DTO/API 후보 생성이 필요하지 않고 Swagger 변경점만 확인할 때는 `refresh`까지만 실행하면 됩니다.

## 기본 흐름

```bash
npx --yes openapi-projector@latest prepare
```

`prepare`는 `refresh -> rules -> project` 흐름을 실행합니다. 즉, Swagger 변경 비교 문서를 먼저 만들고, 그 다음 프로젝트 API 규칙을 분석한 뒤, 검토된 규칙으로 DTO/API 후보를 생성합니다.

첫 실행에서는 `rules` 검토 단계에서 멈추는 것이 정상입니다. 이때 `openapi/changes.md`로 Swagger 변경점을 먼저 보고, `openapi/review/project-rules/analysis.md`, `analysis.json`, `openapi/config/project-rules.jsonc`를 확인한 뒤 실제 프로젝트와 맞을 때만 `review.rulesReviewed`를 `true`로 바꿉니다.

단계를 나눠 보고 싶으면 아래처럼 실행합니다.

```bash
npx --yes openapi-projector@latest doctor --check-url
npx --yes openapi-projector@latest refresh
npx --yes openapi-projector@latest rules
# openapi/config/project-rules.jsonc 검토 후 review.rulesReviewed=true 설정
npx --yes openapi-projector@latest project
```

## 생성되는 파일

| 파일 | 용도 |
| --- | --- |
| `openapi/README.md` | 실제 프로젝트 안에서 읽는 작업 안내서와 AI agent용 상세 지침 |
| `openapi/changes.md` | 사람이 먼저 여는 최신 Swagger/OpenAPI 변경 비교 요약 |
| `openapi/changes.json` | 최신 변경 비교의 machine-readable JSON |
| `openapi/review/changes/history/` | 변경이 감지된 refresh 시점별 비교 스냅샷 |
| `openapi/config/project.jsonc` | OpenAPI JSON URL과 산출물 경로 설정 |
| `openapi/config/project-rules.jsonc` | 프로젝트 API client/import/call style 규칙 |
| `openapi/project/summary.md` | 생성된 DTO/API 후보와 skipped endpoint 요약 |

## 업데이트

배포된 최신 기능을 바로 쓰려면 `@latest`를 붙입니다.

| 상황 | 명령 |
| --- | --- |
| 최신 CLI 기능 사용 | `npx --yes openapi-projector@latest <command>` |
| 팀/CI에서 재현성 우선 | `npx --yes openapi-projector@<version> <command>` |
| 전역 설치 사용 | `openapi-projector <command>` |

예:

```bash
npx --yes openapi-projector@latest refresh
npx --yes openapi-projector@0.2.2 refresh
openapi-projector refresh
```

이미 생성된 `openapi/README.md` 안내 문서만 최신 템플릿으로 갱신하려면 아래 명령을 사용합니다. `project.jsonc`, `project-rules.jsonc`, 변경 이력, 생성 후보 코드는 건드리지 않습니다.

```bash
npx --yes openapi-projector@latest upgrade-docs
```

`npx --yes openapi-projector <command>`는 npm 캐시나 태그 상태에 따라 기대한 최신 배포본이 아닐 수 있으므로, 새 기능을 확인할 때는 `@latest`를 권장합니다.

## AI와 함께 쓰기

AI coding agent에게는 루트 README의 긴 설명보다, `init` 후 생성되는 `openapi/README.md`를 읽게 하는 편이 안전합니다.

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

먼저 openapi/README.md를 읽고, 그 문서의 절차대로 doctor, refresh, rules, project를 진행해.
refresh 후 openapi/changes.md를 먼저 요약해서 Swagger 변경점을 알려줘.
아직 실제 앱 코드에는 반영하지 말고, Swagger 변경 요약과 생성된 endpoint 후보, skipped endpoint를 요약한 뒤
어떤 endpoint를 DTO만 반영할지 또는 DTO + API wrapper까지 반영할지 나에게 물어봐.
```

## 알아둘 점

- `sourceUrl`은 Swagger UI 페이지가 아니라 OpenAPI JSON URL이어야 합니다.
- `Contract Changed` 항목에는 request body, response body, parameter 중심의 필드 단위 변경 내용이 표시됩니다.
- `openapi/project/`는 최종 앱 코드가 아니라 검토용 후보입니다.
- `openapi/changes.md`, `openapi/changes.json`, `openapi/review/`, `openapi/project/`는 보통 커밋하지 않습니다.
- npm 배포 버전이 아니라 현재 저장소 코드를 직접 실행하려면 [도구 개발/유지보수](docs/03-maintainer-notes.md)를 참고하세요.

## 문서

- 변경 이력: [CHANGELOG.md](CHANGELOG.md)
- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
