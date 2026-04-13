# Gap Analysis

이 문서는 [requirements spec](06-requirements-spec.md)를 기준으로 현재 구현 수준과 남은 갭을 정리합니다.

## 한눈에 보기

말씀하신 3단계 기준 현재 평가는 아래와 같습니다.

| 단계 | 목표 | 현재 판단 |
| --- | --- | --- |
| 1 | OpenAPI만으로 결정 가능한 DTO/API와 review 산출물 생성 | 80~85% |
| 2 | 현재 프로젝트 구조 파악 후 규칙 문서화 | 55~60% |
| 3 | 1번 결과 + 2번 규칙으로 프로젝트 컨벤션에 맞는 파일 생성 | 60~65% |

종합하면 방향은 맞습니다.

다만 현재 구현은 “범용 프로젝트 적응형 생성기”보다는 “특정 TypeScript 프론트엔드 구조를 가정한 프로토타입”에 더 가깝습니다.

## 단계별 판단

### 1단계: 결정 가능한 부분의 코드 생성

상태: 대부분 구현됨

이미 가능한 것:

- `download`로 OpenAPI 원본 다운로드
- `catalog`로 endpoint 목록과 변경 요약 생성
- `generate`로 review 문서와 raw DTO/API 생성
- fingerprint 기반 변경 요약 저장

근거:

- `download`: [src/commands/download.mjs](../src/commands/download.mjs)
- `catalog`: [src/commands/catalog.mjs](../src/commands/catalog.mjs)
- `generate`: [src/commands/generate.mjs](../src/commands/generate.mjs)

남은 갭:

- 다중 media type, 더 복잡한 OpenAPI variation에 대한 보장 수준이 문서화/검증되지 않음
- schema validation 이 없음
- 자동 테스트가 없음

### 2단계: 프로젝트 구조 파악과 규칙 문서화

상태: 기본 흐름은 구현됐지만 특정 구조 가정이 강함

이미 가능한 것:

- `rules`로 분석 문서 생성
- `project-rules.jsonc` scaffold 생성
- 기존 import 경로와 feature layout 통계 수집

근거:

- `rules`는 `src/entities`를 기준으로 feature, `api`, `model` 폴더를 수집함
- `fetchAPI`, `Response`, `PagedResponse`, `IPageRequest`, `API_URLS` import 사용 빈도를 집계함
- 관련 코드: [src/commands/rules.mjs](../src/commands/rules.mjs)

핵심 갭:

- 분석 대상이 사실상 `src/entities` 구조에 고정돼 있음
- import 규칙도 특정 symbol 집합 중심임
- 추론 결과가 넓은 프로젝트 패턴을 포괄하지 못함

즉 현재는 “프로젝트 컨벤션을 일반적으로 분석”한다기보다 “현재 가정한 구조에서 힌트를 뽑아 scaffold를 만든다”에 가깝습니다.

### 3단계: 규칙과 raw 결과를 결합한 프로젝트 맞춤 파일 생성

상태: 후보 생성 흐름은 구현됐지만 규칙 반영 범위가 제한적

이미 가능한 것:

- `project`로 후보 DTO/API 생성
- `manifest.json`, `summary.md` 생성
- `apply`로 실제 target 경로 반영

근거:

- 후보 생성: [src/commands/project.mjs](../src/commands/project.mjs)
- 실제 반영: [src/commands/apply.mjs](../src/commands/apply.mjs)

핵심 갭:

- 출력 구조가 `endpoints/<slug>/dto.ts`, `api.ts` 형태로 거의 고정
- 대상 경로도 `applyTargetSrcDir/endpoints/<slug>/...` 구조를 전제로 함
- 규칙 파일의 일부 항목은 scaffold/document 에만 있고 실제 생성 로직에는 연결되지 않음

현재 미연결 또는 사실상 미사용인 항목:

- `api.apiUrlsImportPath`
- `api.pathSource`
- `types.pageRequestTypeName`

즉 “규칙 파일이 존재한다”와 “규칙 파일이 생성 결과를 충분히 지배한다” 사이에 아직 갭이 있습니다.

## 요구사항별 상태

| 요구사항 | 상태 | 판단 |
| --- | --- | --- |
| FR-A1 bootstrap 생성 | 충족 | `init` 구현됨 |
| FR-A2 config discovery | 충족 | 3단계 탐색 구현됨 |
| FR-A3 기본 설정값 | 충족 | defaults + override 구조 있음 |
| FR-B1 원본 다운로드 | 충족 | `download` 구현됨 |
| FR-B2 endpoint catalog | 충족 | fingerprint 포함 |
| FR-B3 review 문서 생성 | 충족 | endpoint 문서 생성됨 |
| FR-B4 raw DTO/API 생성 | 부분 충족 | 핵심 케이스는 처리하나 범위 검증 부족 |
| FR-B5 재생성 가능성 | 대체로 충족 | deterministic 생성 구조이나 테스트 부재 |
| FR-C1 프로젝트 구조 분석 | 부분 충족 | `src/entities` 등 특정 구조에 의존 |
| FR-C2 규칙 분석 문서 생성 | 충족 | 분석 문서 생성됨 |
| FR-C3 규칙 scaffold 생성 | 충족 | JSONC scaffold 생성됨 |
| FR-C4 AI/사람 협업 가능성 | 부분 충족 | 문서/설정은 존재하나 실제 반영 범위 제한 |
| FR-D1 규칙 기반 후보 생성 | 부분 충족 | 생성은 되나 규칙 반영 범위가 좁음 |
| FR-D2 반영 전 후보 영역 유지 | 충족 | `openapi/project`에 후보 생성 |
| FR-D3 프로젝트 컨벤션 반영 | 부분 충족 | 일부 규칙만 실제 반영 |
| FR-D4 manifest / summary 생성 | 충족 | 구현됨 |
| FR-E1 apply | 충족 | manifest 기준 복사 적용 |
| FR-E2 review-first 원칙 | 충족 | `apply` 전 후보 검토 흐름 유지 |

## 비기능 요구사항 상태

| 요구사항 | 상태 | 판단 |
| --- | --- | --- |
| NFR-1 결정성 | 부분 충족 | 구조는 deterministic, 검증 체계 부족 |
| NFR-2 명시성 | 부분 충족 | 규칙 파일은 있으나 일부 규칙은 미연결 |
| NFR-3 안전성 | 부분 충족 | `apply`가 target root 전체를 비움 |
| NFR-4 재사용성 | 부분 충족 | 특정 프로젝트 구조 의존성이 큼 |
| NFR-5 유지보수성 | 부분 충족 | 명령 분리는 됐지만 `generate`/`project` 비대함 |

## 가장 큰 갭 5개

### 1. 프로젝트 분석기가 특정 구조에 과도하게 묶여 있음

현재 `rules`는 `src/entities`와 그 하위 `api`, `model` 패턴을 강하게 전제합니다.

영향:

- 다른 구조의 프로젝트에선 규칙 추론 정확도가 급격히 떨어질 수 있음

### 2. 규칙 파일의 일부 항목이 실제 생성 결과를 지배하지 못함

문서와 scaffold에는 있지만 실제 생성 로직에서 연결되지 않은 항목이 있습니다.

영향:

- 사용자는 규칙을 바꿨는데도 결과가 안 바뀌는 경험을 하게 됨

### 3. 생성 결과 구조가 아직 충분히 프로젝트 맞춤형이 아님

현재 후보 코드와 apply 대상은 거의 고정된 디렉터리 구조를 사용합니다.

영향:

- “프로젝트 컨벤션 반영”보다 “도구 기본 구조 적용” 쪽으로 동작함

### 4. 검증 체계 부재

- schema validation 없음
- 자동 테스트 없음
- fixture 기반 회귀 검증 없음

영향:

- deterministic generator 라는 목표 대비 신뢰성이 약함

### 5. `apply`의 안전성이 제한적

현재 `apply`는 target root 를 비운 후 manifest 기반으로 복사합니다.

영향:

- 사용자가 기대하지 않은 파일 손실 가능성이 있음
- 부분 적용 전략이나 dry-run 전략이 없음

## 우선순위 제안

### P1. 규칙 파일과 생성 로직 연결 강화

먼저 해야 할 일:

- `apiUrlsImportPath`, `pathSource`, `pageRequestTypeName`를 실제 생성 로직에 연결
- target 디렉터리 전략을 규칙으로 분리
- endpoint 파일 네이밍/배치 규칙을 설정화

이유:

- 3단계 완성도를 가장 직접적으로 올립니다.

### P2. `rules` 일반화

다음으로 해야 할 일:

- `src/entities` 하드코딩 완화
- 분석 대상을 설정화하거나 fallback 전략 추가
- import 추론 대상 symbol 확장

이유:

- 2단계가 범용화되어야 여러 프로젝트에 재사용 가능합니다.

### P3. 검증 체계 도입

필수로 해야 할 일:

- config schema validation
- fixture 기반 snapshot / golden test
- sample OpenAPI spec 기반 회귀 테스트

이유:

- generator 류 도구는 테스트가 없으면 확장할수록 깨지기 쉽습니다.

### P4. `apply` 안전장치 추가

권장 작업:

- dry-run
- overwrite 전략 선택
- manifest 외 파일 보존 옵션

이유:

- 실사용 단계로 가려면 안전성이 필요합니다.

## 결론

현재 구현은 처음 정의한 방향과 구조는 잘 맞습니다.

하지만 현재 상태를 더 정확히 표현하면 아래와 같습니다.

- 1단계는 꽤 잘 만들어짐
- 2단계는 “규칙 문서화”의 형태는 있으나 범용성이 부족함
- 3단계는 “프로젝트 맞춤 생성”의 흐름은 있으나 실제 규칙 지배력이 아직 약함

즉 이 저장소는 “목표와 다른 프로젝트”가 아니라, “목표를 향해 잘 가고 있지만 아직 2단계와 3단계의 일반화와 연결이 부족한 프로젝트”입니다.
