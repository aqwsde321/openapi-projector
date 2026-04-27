# openapi-projector 작업 가이드

이 폴더는 `openapi-projector`가 생성하고 갱신하는 OpenAPI 작업 영역입니다.

AI나 개발자는 프론트엔드 프로젝트 루트에서 아래 순서로 사용합니다.

## 1. 먼저 설정할 것

`openapi/config/project.jsonc`의 `sourceUrl`을 실제 OpenAPI JSON URL로 바꿉니다.

```jsonc
{
  "sourceUrl": "<openapi-json-url>"
}
```

주의:

- Swagger UI 화면 주소가 아니라 JSON을 반환하는 URL이어야 합니다.
- `sourceUrl`이 비어 있거나 예시값이면 `doctor`, `prepare`가 막힙니다.

## 2. 권장 단계별 실행

```bash
openapi-projector doctor
openapi-projector doctor --check-url
openapi-projector refresh
openapi-projector rules
# openapi/review/project-rules/analysis.md 확인
# openapi/config/project-rules.jsonc 수정
openapi-projector project
```

역할:

- `doctor`: 설정과 작업 폴더 상태를 점검합니다.
- `doctor --check-url`: OpenAPI URL 접근까지 확인합니다.
- `refresh`: OpenAPI를 내려받고 endpoint/schema 검토 자료를 생성합니다.
- `rules`: 현재 프론트엔드 프로젝트를 분석하고 코드 생성 규칙 초안을 만듭니다.
- `project`: 확정된 규칙으로 후보 DTO/API 코드를 생성합니다.

빠르게 전체를 다시 만들 때는 아래 shortcut을 사용할 수 있습니다.

```bash
openapi-projector prepare
```

`prepare`는 내부에서 `refresh -> rules -> project`를 실행합니다.

## 3. AI가 rules 이후 해야 할 일

`openapi-projector rules` 실행 후 AI는 반드시 아래 파일을 읽고 현재 프로젝트에 맞게 규칙을 보정합니다.

- `openapi/review/project-rules/analysis.md`
- `openapi/config/project-rules.jsonc`

확인/수정 기준:

- `fetchApiImportPath`: 실제 프로젝트에서 사용하는 HTTP client import 경로인지 확인합니다.
- `fetchApiSymbol`: 실제 HTTP client 함수명과 맞는지 확인합니다.
- `adapterStyle`: 기존 호출 방식에 맞게 `url-config` 또는 `request-object` 중 하나를 선택합니다.
- `tagFileCase`: 생성 폴더명이 프로젝트 컨벤션과 맞는지 확인합니다.

규칙을 수정한 뒤 `openapi-projector project`를 실행해서 후보 코드를 다시 생성합니다.

## 4. 중요한 파일

| 경로 | 역할 |
| --- | --- |
| `openapi/config/project.jsonc` | OpenAPI URL과 산출물 경로 설정 |
| `openapi/config/project-rules.jsonc` | 기존 HTTP client import/naming 규칙. 사람이거나 AI가 수정 |
| `openapi/review/catalog/endpoints.md` | 전체 endpoint 목록 |
| `openapi/review/docs/` | endpoint별 검토 문서 |
| `openapi/review/project-rules/analysis.md` | 프로젝트 규칙 분석 결과 |
| `openapi/review/generated/schema.ts` | OpenAPI schema 타입 |
| `openapi/project/src/openapi-generated/` | 앱에 반영할 후보 DTO/API 코드 |
| `openapi/project/summary.md` | 생성 결과 요약 |

## 5. AI 적용 절차

1. `openapi-projector doctor`로 현재 상태를 확인합니다.
2. `sourceUrl` 오류가 있으면 `openapi/config/project.jsonc`를 먼저 수정합니다.
3. `openapi-projector refresh`를 실행합니다.
4. `openapi-projector rules`를 실행합니다.
5. `openapi/review/project-rules/analysis.md`를 읽고 `openapi/config/project-rules.jsonc`를 보정합니다.
6. `openapi-projector project`를 실행합니다.
7. `openapi/project/summary.md`와 `openapi/project/src/openapi-generated/`를 읽습니다.
8. 필요한 DTO/API만 실제 앱 코드 위치로 반영합니다.
9. 앱의 타입 체크와 테스트를 실행합니다.

## 6. Git 관리 기준

커밋 권장:

- `openapi/README.md`
- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

기본 ignore:

- `openapi/_internal/`
- `openapi/review/`
- `openapi/project/`

`review/`와 `project/`는 재생성 가능한 산출물입니다. 후보 코드는 검토 후 실제 앱 코드 위치에 반영하고, 그 실제 앱 코드만 커밋합니다.

## 7. 직접 수정하지 말 것

- `openapi/_internal/source/openapi.json`은 원본 캐시입니다.
- `openapi/review/`는 검토용 산출물입니다.
- `openapi/project/src/openapi-generated/`는 후보 코드입니다. 실제 앱 반영 후에도 다음 `prepare`에서 다시 생성될 수 있습니다.
