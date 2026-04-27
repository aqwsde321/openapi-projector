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

## 2. 기본 명령

```bash
openapi-projector doctor
openapi-projector doctor --check-url
openapi-projector prepare
```

역할:

- `doctor`: 설정과 작업 폴더 상태를 점검합니다.
- `doctor --check-url`: OpenAPI URL 접근까지 확인합니다.
- `prepare`: OpenAPI를 내려받고 검토 문서와 후보 코드를 생성합니다.

## 3. 중요한 파일

| 경로 | 역할 |
| --- | --- |
| `openapi/config/project.jsonc` | OpenAPI URL과 산출물 경로 설정 |
| `openapi/config/project-rules.jsonc` | 기존 HTTP client import/naming 규칙 |
| `openapi/review/catalog/endpoints.md` | 전체 endpoint 목록 |
| `openapi/review/docs/` | endpoint별 검토 문서 |
| `openapi/review/generated/schema.ts` | OpenAPI schema 타입 |
| `openapi/project/src/openapi-generated/` | 앱에 반영할 후보 DTO/API 코드 |
| `openapi/project/summary.md` | 생성 결과 요약 |

## 4. AI 적용 절차

1. `openapi-projector doctor`로 현재 상태를 확인합니다.
2. `sourceUrl` 오류가 있으면 `openapi/config/project.jsonc`를 먼저 수정합니다.
3. `openapi-projector prepare`를 실행합니다.
4. `openapi/project/summary.md`와 `openapi/project/src/openapi-generated/`를 읽습니다.
5. 필요한 DTO/API만 실제 앱 코드 위치로 반영합니다.
6. 앱의 타입 체크와 테스트를 실행합니다.

## 5. 직접 수정하지 말 것

- `openapi/_internal/source/openapi.json`은 원본 캐시입니다.
- `openapi/review/`는 검토용 산출물입니다.
- `openapi/project/src/openapi-generated/`는 후보 코드입니다. 실제 앱 반영 후에도 다음 `prepare`에서 다시 생성될 수 있습니다.
