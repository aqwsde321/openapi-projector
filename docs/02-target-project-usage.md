# Target Project Usage

이 문서는 대상 프로젝트 적용 절차를 설명합니다.

설정 필드 상세 설명은 [04-config-reference.md](./04-config-reference.md), 현재 생성 구조는 [10-current-structure-and-config.md](./10-current-structure-and-config.md)를 보면 됩니다.

## 전제

- 명령은 **도구 저장소 루트에서 실행**합니다.
- 어느 프로젝트를 조작할지는 도구 저장소 루트의 `.openapi-tool.local.jsonc` 로 정합니다.
- 대상 프로젝트 루트로 직접 이동해서 실행할 필요는 없습니다.

## 1. `.openapi-tool.local.example.jsonc` 복사

```bash
cp .openapi-tool.local.example.jsonc .openapi-tool.local.jsonc
```

그 다음 `.openapi-tool.local.jsonc` 를 수정합니다.

```jsonc
{
  "projectRoot": "",
  "initDefaults": {
    "sourceUrl": "",
    "applyTargetSrcDir": ""
  }
}
```

여기서 보통 채우는 값은 두 개뿐입니다.

- `projectRoot`
  - 대상 프로젝트 절대 경로
- `initDefaults.sourceUrl`
  - OpenAPI JSON 요청 URL
  - Swagger UI 주소가 아니라 `/v3/api-docs`, `/openapi.json` 같은 실제 JSON URL

예:

```jsonc
{
  "projectRoot": "/path/to/service-app",
  "initDefaults": {
    "sourceUrl": "https://dev-api.example.com/v3/api-docs",
    "applyTargetSrcDir": ""
  }
}
```

## 2. bootstrap 생성

```bash
npm run openapi:init
```

생성:

- `openapi/config/project.jsonc`
- `openapi/config/project-rules.jsonc`
- `openapi/.gitignore`

## 3. review 산출물 생성

```bash
npm run openapi:refresh
```

확인:

- `openapi/review/catalog/endpoints.md`
- `openapi/review/changes/summary.md`
- `openapi/review/docs/*.md`
- `openapi/review/generated/schema.ts`

## 4. 프로젝트 규칙 분석

```bash
npm run openapi:rules
```

확인:

- `openapi/review/project-rules/analysis.md`
- `openapi/config/project-rules.jsonc`

이 단계 뒤에 `project-rules.jsonc`를 검토합니다.

## 5. DTO/API 후보 코드 생성

```bash
npm run openapi:project
```

확인:

- `openapi/project/src/openapi-generated`
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.dto.ts`
- `openapi/project/src/openapi-generated/<tag>/<endpoint>.api.ts`
- `openapi/project/summary.md`

## 6. 실제 `src` 반영

```bash
npm run openapi:apply
```

기본 반영 위치:

- `src/openapi-generated`

## 권장 순서

```bash
npm run openapi:init
npm run openapi:refresh
npm run openapi:rules

# project-rules.jsonc 검토

npm run openapi:project

# openapi/project/src/openapi-generated 검토

npm run openapi:apply
```

## 꼭 기억할 점

- `help`를 제외한 모든 명령은 `projectRoot`가 있어야 실행됩니다.
- `projectRoot`는 `.openapi-tool.local.jsonc` 또는 `--project-root`로 정합니다.
- `apply` 전까지는 대상 프로젝트 실제 `src`를 건드리지 않습니다.
- 실제 코드 변경은 `apply`에서만 일어납니다.
