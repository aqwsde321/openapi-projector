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
- `openapi-projector init` 실행 시 현재 프로젝트 루트에 자동 생성

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
| `sourceUrl` | OpenAPI JSON 요청 URL. `doctor`, `prepare` 전에 반드시 설정 |
| `sourcePath` | 내려받은 OpenAPI JSON 저장 경로 |
| `generatedSchemaPath` | review용 `schema.ts` 출력 경로 |
| `projectGeneratedSrcDir` | `project` 후보 코드 생성 경로 |

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
| `api.adapterStyle` | runtime client 호출 방식 | `url-config`, `request-object` |
| `api.tagFileCase` | 태그 폴더명 방식 | `title`, `kebab` |

검증 규칙:

- `api.fetchApiSymbol`은 JavaScript identifier 여야 합니다.
- `api.adapterStyle`은 `url-config` 또는 `request-object`만 지원합니다.
- `api.wrapperGrouping`은 현재 `tag`만 지원합니다.
- `api.tagFileCase`는 `title` 또는 `kebab`만 지원합니다.
- `layout.schemaFileName`은 경로가 아닌 `.ts` 파일명이어야 합니다.

### 현재 고정에 가까운 값

| 필드 | 설명 |
| --- | --- |
| `api.wrapperGrouping` | 현재 MVP는 `tag` 고정 |
| `layout.schemaFileName` | 기본값 `schema.ts` |

## 4. Config Discovery

도구는 대상 프로젝트 기준으로 아래 순서로 `project.jsonc`를 찾습니다.

1. `openapi.config.jsonc`
2. `openapi/config/project.jsonc`
3. `config/project.jsonc`
