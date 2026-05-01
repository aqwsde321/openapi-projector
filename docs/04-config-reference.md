# Config Reference

이 문서는 **설정값만** 설명합니다.

빠른 사용법과 생성 구조는 [README](../README.md)를 보면 됩니다.

설정 파일은 JSONC로 읽습니다. 주석과 trailing comma를 사용할 수 있습니다.

## 1. 프로젝트 루트 로컬 설정

파일:

- `.openapi-projector.local.example.jsonc`
- `.openapi-projector.local.jsonc`
- `.openapi-tool.local.example.jsonc`
- `.openapi-tool.local.jsonc`

역할:

- 예시 템플릿 제공
- 어느 프로젝트를 조작할지 결정
- `npx --yes openapi-projector init` 실행 시 현재 프로젝트 루트에 자동 생성

탐색 우선순위:

1. `.openapi-projector.local.jsonc`
2. `.openapi-tool.local.jsonc` legacy fallback

기본 템플릿:

```jsonc
{
  "projectRoot": "."
}
```

### 자주 바꾸는 값

| 필드 | 의미 |
| --- | --- |
| `projectRoot` | 대상 프로젝트 경로. 보통 현재 디렉터리인 `.` 사용 |

주의:

- `projectRoot`가 없으면 현재 실행 디렉터리를 대상 프로젝트로 사용합니다.
- `sourceUrl`은 `openapi/config/project.jsonc`에서 설정합니다.

## 2. 대상 프로젝트 `project.jsonc`

파일:

- `openapi/config/project.jsonc`

역할:

- OpenAPI 원본 위치
- review 산출물 위치
- project 후보 위치

### 자주 보는 값

| 필드 | 의미 |
| --- | --- |
| `sourceUrl` | OpenAPI JSON 요청 URL. 기본값은 `http://localhost:8080/v3/api-docs`이며, 로컬 백엔드 URL이 다르면 `doctor`, `prepare` 전에 수정 |
| `sourcePath` | 내려받은 OpenAPI JSON 저장 경로 |
| `generatedSchemaPath` | review용 `schema.ts` 출력 경로 |
| `projectGeneratedSrcDir` | `project` 후보 코드 생성 경로 |

경로 설정값은 프로젝트 루트 기준 상대 경로여야 하며, `..` 경로 세그먼트나 절대 경로는 허용하지 않습니다. `sourceUrl`은 문자열 타입이어야 합니다. 빈 문자열은 설정 파일 형식으로는 허용되지만, OpenAPI JSON URL이 아니므로 `doctor`, `prepare`, `download`에서 실패합니다.

### 보통 안 건드리는 값

- `catalogJsonPath`
- `catalogMarkdownPath`
- `docsDir`
- `projectRulesAnalysisPath`
- `projectRulesAnalysisJsonPath`
- `projectRulesPath`

## 3. 대상 프로젝트 `project-rules.jsonc`

파일:

- `openapi/config/project-rules.jsonc`

역할:

- 대상 프로젝트의 HTTP client와 naming 규칙을 `project` 단계에 전달

### 자주 바꾸는 값

| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `api.fetchApiImportPath` | 기존 fetch helper import 경로 | `@/shared/api` |
| `api.fetchApiSymbol` | fetch helper 이름 | `fetchAPI` |
| `api.fetchApiImportKind` | fetch helper import 방식 | `named`, `default` |
| `api.adapterStyle` | runtime client 호출 방식 | `url-config`, `request-object` |
| `api.wrapperGrouping` | API/DTO wrapper 배치 방식 | `tag`, `flat` |
| `api.tagFileCase` | 태그 폴더명 방식 | `title`, `kebab` |
| `hooks.enabled` | React Query hook 후보 생성 여부 | `false`, `true` |
| `hooks.queryMethods` | query hook으로 생성할 HTTP method 목록 | `["GET"]` |
| `hooks.mutationMethods` | mutation hook으로 생성할 HTTP method 목록 | `["POST", "PUT", "PATCH", "DELETE"]` |
| `hooks.queryKeyStrategy` | queryKey 생성 방식 | `path-and-params`, `path-and-fields` |
| `hooks.responseUnwrap` | hook 반환값에서 `response.data`를 꺼낼지 여부 | `none`, `data` |
| `hooks.staleTimeImportPath` | query hook의 staleTime symbol import 경로 | `@/shared/constant/api` |
| `hooks.staleTimeSymbol` | query hook staleTime symbol 이름 | `STALE_TIME` |
| `review.rulesReviewed` | `prepare`/`project` 후보 생성 전 분석 결과와 실제 API client 확인 여부 | `false`, `true` |

검증 규칙:

- `api.fetchApiSymbol`은 JavaScript identifier 여야 합니다.
- `api.fetchApiImportKind`는 `named` 또는 `default`만 지원합니다.
- `api.adapterStyle`은 `url-config` 또는 `request-object`만 지원합니다.
- `api.wrapperGrouping`은 `tag` 또는 `flat`만 지원합니다.
- `api.tagFileCase`는 `title` 또는 `kebab`만 지원합니다.
- `hooks.library`는 현재 `@tanstack/react-query`만 지원합니다.
- `hooks.queryMethods`와 `hooks.mutationMethods`는 중복되지 않는 HTTP method 배열이어야 합니다.
- `hooks.queryKeyStrategy`는 `path-and-params` 또는 `path-and-fields`만 지원합니다.
- `hooks.responseUnwrap`은 `none` 또는 `data`만 지원합니다.
- `hooks.staleTimeImportPath`와 `hooks.staleTimeSymbol`은 둘 다 있거나 둘 다 없어야 합니다.
- `layout.schemaFileName`은 경로가 아닌 `.ts` 파일명이어야 합니다.

### 배치 방식

| 값 | 설명 |
| --- | --- |
| `tag` | 기본값. `<tag>/<endpoint>.dto.ts`, `<tag>/<endpoint>.api.ts` 형태로 생성 |
| `flat` | 태그 폴더 없이 `<endpoint>.dto.ts`, `<endpoint>.api.ts`를 `projectGeneratedSrcDir` 바로 아래에 생성 |

### React Query hook 생성

`hooks.enabled`가 `true`이면 `project` 단계에서 API/DTO 후보와 함께 hook 후보를 생성합니다.

| Endpoint method | 생성 파일 |
| --- | --- |
| `hooks.queryMethods`에 포함 | `<endpoint>.query.ts` |
| `hooks.mutationMethods`에 포함 | `<endpoint>.mutation.ts` |

기본 queryKey는 `[path, params]` 형태입니다. `hooks.queryKeyStrategy`를 `path-and-fields`로 바꾸면 flat request DTO의 필드를 `[path, params.page, params.size]`처럼 펼쳐 씁니다. `hooks.responseUnwrap`을 `data`로 설정하면 hook의 `queryFn`/`mutationFn`이 API wrapper 결과에서 `.data`를 반환합니다.

## 4. Config Discovery

도구는 대상 프로젝트 기준으로 아래 순서로 `project.jsonc`를 찾습니다.

1. `openapi.config.jsonc`
2. `openapi/config/project.jsonc`
3. `config/project.jsonc`
