# Config Reference

이 문서는 **설정값만** 설명합니다.

실제 사용 순서는 [02-target-project-usage.md](./02-target-project-usage.md), 현재 구조는 [10-current-structure-and-config.md](./10-current-structure-and-config.md)를 보면 됩니다.

## 1. 도구 저장소 로컬 설정

파일:

- `.openapi-tool.local.example.jsonc`
- `.openapi-tool.local.jsonc`

역할:

- 예시 템플릿 제공
- 어느 프로젝트를 조작할지 결정
- `init` 시 대상 프로젝트 설정의 기본값을 채워 넣음

기본 템플릿:

```jsonc
{
  "projectRoot": "",
  "initDefaults": {
    "sourceUrl": "",
    "applyTargetSrcDir": ""
  }
}
```

### 자주 바꾸는 값

| 필드 | 의미 |
| --- | --- |
| `projectRoot` | 대상 프로젝트 절대 경로 |
| `initDefaults.sourceUrl` | OpenAPI JSON 요청 URL |
| `initDefaults.applyTargetSrcDir` | `init` 시 기본 권장 반영 경로. 비워 두면 `src/openapi-generated` 사용 |

주의:

- `projectRoot`가 비어 있으면 `help`를 제외한 명령은 실행되지 않습니다.
- `sourceUrl`은 Swagger UI 주소가 아니라 OpenAPI JSON 요청 URL입니다.

## 2. 대상 프로젝트 `project.jsonc`

파일:

- `openapi/config/project.jsonc`

역할:

- OpenAPI 원본 위치
- review 산출물 위치
- project 후보 위치
- 권장 반영 위치

### 자주 보는 값

| 필드 | 의미 |
| --- | --- |
| `sourceUrl` | OpenAPI JSON 요청 URL |
| `sourcePath` | 내려받은 OpenAPI JSON 저장 경로 |
| `generatedSchemaPath` | review용 `schema.ts` 출력 경로 |
| `projectGeneratedSrcDir` | `project` 후보 코드 생성 경로 |
| `applyTargetSrcDir` | 사람이거나 AI가 반영할 때 참고하는 권장 경로 |

### 보통 안 건드리는 값

- `catalogJsonPath`
- `catalogMarkdownPath`
- `docsDir`
- `projectRulesAnalysisPath`
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
