# openapi-projector

`openapi-projector`는 Swagger/OpenAPI 변경을 먼저 검토하고, 필요한 endpoint만 TypeScript DTO/API 후보 코드로 뽑아보는 review-first CLI입니다.

생성 결과는 앱 `src/`에 바로 쓰지 않고 프론트엔드 프로젝트 안의 `openapi/` 작업 공간에 먼저 쌓입니다.

## 왜 쓰나요

- Swagger가 바뀌었을 때 어느 endpoint의 무엇이 바뀌었는지 `openapi/changes.md`에서 먼저 확인합니다.
- endpoint 추가/삭제, request/response/parameter 계약 변경, 문서성 변경을 구분해서 봅니다.
- 기존 API client, import 경로, request call style을 분석한 뒤 endpoint별 `.dto.ts`, `.api.ts` 후보를 만듭니다.
- 필요한 endpoint 코드만 골라 실제 앱 구조에 맞게 옮길 수 있습니다.
- `openapi/review/`와 `openapi/project/`는 재생성 가능한 검토 산출물이라 앱 코드와 분리됩니다.

## 빠른 시작

프론트엔드 프로젝트 루트에서 실행합니다.

### Step 1. 작업 공간 초기화

```bash
npx --yes openapi-projector@latest init
```


실행하면 OpenAPI JSON URL을 묻습니다.


```text
OpenAPI JSON URL [http://localhost:8080/v3/api-docs]:
```


Enter를 누르면 기본값을 쓰고, 다른 주소를 쓰려면 OpenAPI JSON URL을 붙여넣습니다. Swagger UI 페이지 URL을 넣어도 같은 서버의 대표 JSON 경로를 자동으로 찾아봅니다.


백엔드에 접근할 수 없으면 `skip`을 입력합니다. `openapi/config/project.jsonc`의 `sourceUrl`에서 나중에 수정할 수 있습니다.


### Step 2. AI에게 맡기거나 직접 진행

`init`이 끝난 뒤에는 아래 둘 중 하나로 진행합니다.

#### Option A. AI에게 맡기기

```text
이 프론트엔드 프로젝트에 openapi-projector를 적용해줘.

1. 먼저 openapi/README.md를 읽어.
2. openapi/config/project.jsonc의 sourceUrl이 Swagger UI 페이지가 아니라 OpenAPI JSON URL인지 확인해.
   sourceUrl이 비어 있거나 잘못되어 있으면 나에게 올바른 OpenAPI JSON URL을 물어봐.
3. npx --yes openapi-projector@latest doctor --check-url을 실행해.
4. npx --yes openapi-projector@latest prepare를 실행하고 openapi/changes.md를 확인해.
   Added, Removed, Contract Changed, Doc Changed를 endpoint별로 먼저 요약해서 나에게 알려줘.
5. prepare가 rules 검토 단계에서 멈췄다면 openapi/review/project-rules/analysis.md와 analysis.json을 읽고,
   실제 프로젝트의 API client, import 경로, request 호출 방식을 확인해.
6. rules가 만든 openapi/config/project-rules.jsonc 초안이 프로젝트 컨벤션과 맞는지 확인해.
   맞지 않는 부분이 있으면 수정하고, 맞다고 판단되면 review.rulesReviewed를 true로 바꿔.
7. review.rulesReviewed를 true로 바꾼 뒤 npx --yes openapi-projector@latest prepare를 다시 실행해.
8. openapi/project/summary.md를 읽고 생성된 endpoint와 skipped endpoint를 요약해.

아직 실제 앱 코드에는 반영하지 말고, Swagger 변경 비교 요약과 DTO/API 후보 요약을 나눈 뒤 내가 어떤 endpoint를 적용할지 아래 형식으로 물어봐.

적용할 endpoint:
- <METHOD> <PATH> 또는 operationId

반영 범위:
- DTO만
- DTO + API wrapper

사용할 실제 앱 코드 위치:
- <예: src/features/user/api>
```

#### Option B. 직접 진행하기

```bash
npx --yes openapi-projector@latest prepare
```

`prepare`는 아래 흐름을 한 번에 실행합니다.

```text
refresh -> rules -> project
```

- `refresh`: Swagger/OpenAPI를 내려받고 이전 버전과 비교해 `openapi/changes.md`를 만듭니다.
- `rules`: 현재 프론트엔드 프로젝트의 API 호출 규칙을 분석해 `openapi/config/project-rules.jsonc`를 만듭니다.
- `project`: 검토된 규칙으로 DTO/API 후보를 생성합니다.

처음 실행하면 `rules` 검토 단계에서 멈추는 것이 정상입니다. 생성 규칙이 실제 프로젝트와 맞는지 확인한 뒤, 아래 파일에서 `review.rulesReviewed`를 `true`로 바꿉니다.

```text
openapi/config/project-rules.jsonc
```

의미는 “이 프로젝트의 API client/import/call style 규칙을 확인했으니, 이 규칙으로 DTO/API 후보를 만들어도 된다”는 승인 표시입니다.

```jsonc
{
  "review": {
    "rulesReviewed": true
  }
}
```

그 다음 `prepare`를 다시 실행합니다.

```bash
npx --yes openapi-projector@latest prepare
```

두 번째 실행부터는 검토된 rules로 `openapi/project/summary.md`와 `openapi/project/src/openapi-generated/` 아래 DTO/API 후보가 생성됩니다.

## Swagger 변경 비교

가장 먼저 보는 산출물은 `openapi/changes.md`입니다. DTO/API 후보 생성이 필요하지 않고 Swagger 변경점만 확인할 때는 `refresh`를 단독으로 실행합니다.

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

## 명령을 나눠서 실행하기

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
npx --yes openapi-projector@latest prepare
npx --yes openapi-projector@0.2.2 prepare
openapi-projector prepare
```

이미 생성된 `openapi/README.md` 안내 문서만 최신 템플릿으로 갱신하려면 아래 명령을 사용합니다. `project.jsonc`, `project-rules.jsonc`, 변경 이력, 생성 후보 코드는 건드리지 않습니다.

```bash
npx --yes openapi-projector@latest upgrade-docs
```

`npx --yes openapi-projector <command>`는 npm 캐시나 태그 상태에 따라 기대한 최신 배포본이 아닐 수 있으므로, 새 기능을 확인할 때는 `@latest`를 권장합니다.

## 문서

- 변경 이력: [CHANGELOG.md](CHANGELOG.md)
- 개념과 단계: [docs/01-concepts.md](docs/01-concepts.md)
- 설정값: [docs/04-config-reference.md](docs/04-config-reference.md)
- 도구 개발/유지보수: [docs/03-maintainer-notes.md](docs/03-maintainer-notes.md)
