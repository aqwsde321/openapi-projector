# Gap Analysis

이 문서는 [requirements spec](06-requirements-spec.md)를 기준으로 현재 구현 수준과 남은 갭을 정리합니다.

## 한눈에 보기

말씀하신 3단계 기준 현재 평가는 아래와 같습니다.

| 단계 | 목표 | 현재 판단 |
| --- | --- | --- |
| 1 | OpenAPI만으로 결정 가능한 review 산출물과 `schema.ts` 생성 | 85~90% |
| 2 | 현재 프로젝트 구조 파악 후 규칙 문서화 | 60~65% |
| 3 | 1번 결과 + 2번 규칙으로 프로젝트 컨벤션에 맞는 파일 생성 | 80~85% |

종합하면 방향은 맞습니다.

다만 현재 구현은 “범용 프로젝트 적응형 생성기”보다는 “특정 TypeScript 프론트엔드 구조를 가정한 프로토타입”에 더 가깝습니다.

## 단계별 판단

### 1단계: 결정 가능한 부분의 코드 생성

상태: 대부분 구현됨

이미 가능한 것:

- `download`로 OpenAPI 원본 다운로드
- `catalog`로 endpoint 목록과 변경 요약 생성
- `generate`로 review 문서와 `schema.ts` 생성
- fingerprint 기반 변경 요약 저장

근거:

- `download`: [src/commands/download.mjs](../src/commands/download.mjs)
- `catalog`: [src/commands/catalog.mjs](../src/commands/catalog.mjs)
- `generate`: [src/commands/generate.mjs](../src/commands/generate.mjs)

남은 갭:

- OpenAPI 3.0/3.1 JSON만 지원하고 OAS2/YAML 은 제외됨
- 다중 media type, cookie, multipart 는 project 단계에서 명시적으로 실패함
- schema validation, runtime validation 은 아직 없음

### 2단계: 프로젝트 구조 파악과 규칙 문서화

상태: 기본 흐름은 구현됐지만 특정 구조 가정이 강함

이미 가능한 것:

- `rules`로 분석 문서 생성
- `project-rules.jsonc` scaffold 생성
- 기존 `fetchAPI`, `AxiosRequestConfig` import 경로 추론

근거:

- `rules`는 `src/entities`를 우선 보고, 없으면 `src`를 fallback 으로 사용함
- `fetchAPI`, `AxiosRequestConfig` import 사용 빈도를 집계함
- 관련 코드: [src/commands/rules.mjs](../src/commands/rules.mjs)

핵심 갭:

- 분석이 여전히 import heuristic 중심임
- alias/path mapping 이 복잡한 프로젝트에서는 추론 품질이 제한될 수 있음
- fetch helper 계약 외의 런타임 규칙은 아직 설정 범위에 없음

즉 현재는 “프로젝트 컨벤션을 일반적으로 분석”한다기보다 “현재 가정한 구조에서 힌트를 뽑아 scaffold를 만든다”에 가깝습니다.

### 3단계: 규칙과 raw 결과를 결합한 프로젝트 맞춤 파일 생성

상태: 후보 생성 흐름은 구현됐지만 규칙 반영 범위가 제한적

이미 가능한 것:

- `project`로 `schema.ts + 태그 폴더 내부 엔드포인트별 DTO/API` 생성
- `manifest.json`, `summary.md` 생성
- `apply`로 실제 target 경로 반영

근거:

- 후보 생성: [src/commands/project.mjs](../src/commands/project.mjs)
- 실제 반영: [src/commands/apply.mjs](../src/commands/apply.mjs)

핵심 갭:

- 출력 구조는 `schema.ts + <tag>/<endpoint>.dto.ts + <tag>/<endpoint>.api.ts + <tag>/index.ts + index.ts`로 고정
- wrapper 분할은 현재 `tag`만 지원
- 성공 응답은 여전히 JSON 계열만 지원하고, multiple media type 선택 로직은 미지원

즉 “규칙 파일이 존재한다”와 “여러 프로젝트 규칙을 폭넓게 흡수한다” 사이에 아직 갭이 있습니다.

## 요구사항별 상태

| 요구사항 | 상태 | 판단 |
| --- | --- | --- |
| FR-A1 bootstrap 생성 | 충족 | `init` 구현됨 |
| FR-A2 config discovery | 충족 | 3단계 탐색 구현됨 |
| FR-A3 기본 설정값 | 충족 | defaults + override 구조 있음 |
| FR-B1 원본 다운로드 | 충족 | `download` 구현됨 |
| FR-B2 endpoint catalog | 충족 | fingerprint 포함 |
| FR-B3 review 문서 생성 | 충족 | endpoint 문서 생성됨 |
| FR-B4 review schema 생성 | 충족 | `openapi-typescript` 기반 |
| FR-B5 재생성 가능성 | 대체로 충족 | deterministic 생성 구조이나 테스트 부재 |
| FR-C1 프로젝트 구조 분석 | 부분 충족 | `src` fallback 이 있으나 heuristic 중심 |
| FR-C2 규칙 분석 문서 생성 | 충족 | 분석 문서 생성됨 |
| FR-C3 규칙 scaffold 생성 | 충족 | JSONC scaffold 생성됨 |
| FR-C4 AI/사람 협업 가능성 | 부분 충족 | 문서/설정은 존재하나 실제 반영 범위 제한 |
| FR-D1 규칙 기반 후보 생성 | 부분 충족 | 생성은 되나 규칙 반영 범위가 좁음 |
| FR-D2 반영 전 후보 영역 유지 | 충족 | `openapi/project`에 후보 생성 |
| FR-D3 프로젝트 컨벤션 반영 | 부분 충족 | 핵심 규칙은 반영하나 지원 범위는 좁음 |
| FR-D4 manifest / summary 생성 | 충족 | 구현됨 |
| FR-E1 apply | 충족 | manifest 기준 복사 적용 |
| FR-E2 review-first 원칙 | 충족 | `apply` 전 후보 검토 흐름 유지 |

## 비기능 요구사항 상태

| 요구사항 | 상태 | 판단 |
| --- | --- | --- |
| NFR-1 결정성 | 충족 | fixture 테스트와 deterministic 생성 경로 확보 |
| NFR-2 명시성 | 부분 충족 | 규칙 파일은 있으나 일부 규칙은 미연결 |
| NFR-3 안전성 | 부분 충족 | `apply`가 target root 전체를 비움 |
| NFR-4 재사용성 | 부분 충족 | 특정 프로젝트 구조 의존성이 큼 |
| NFR-5 유지보수성 | 부분 충족 | 명령은 얇아졌지만 config/schema validation 은 미구현 |

## 가장 큰 갭 5개

### 1. 입력 스펙 범위가 MVP로 제한돼 있음

현재는 OpenAPI 3.0/3.1 JSON만 지원합니다.

영향:

- OAS2, YAML, 외부 ref 복잡 케이스는 아직 별도 대응이 필요함

### 2. 프로젝트 분석기가 여전히 heuristic 중심임

현재 `rules`는 최소 scaffold 에 집중되어 있고, 복잡한 프로젝트 컨벤션까지 일반화하진 못합니다.

영향:

- 다른 구조의 프로젝트에선 규칙 추론 정확도가 제한될 수 있음

### 3. 생성 결과 구조가 의도적으로 고정돼 있음

현재 후보 코드와 apply 대상은 `schema.ts + <tag>/<endpoint>.dto.ts + <tag>/<endpoint>.api.ts` 구조를 고정으로 사용합니다.

영향:

- MVP 단계에서는 안정적이지만, 더 자유로운 배치 규칙을 원하면 확장 필요

### 4. 검증 체계 확장 필요

- config/schema validation 없음
- runtime validation 없음
- openapi lint 연동 없음

영향:

- deterministic generator 라는 목표 대비 신뢰성이 약함

### 5. `apply`의 안전성이 제한적

현재 `apply`는 target root 를 비운 후 manifest 기반으로 복사합니다.

영향:

- 사용자가 기대하지 않은 파일 손실 가능성이 있음
- 부분 적용 전략이나 dry-run 전략이 없음

## 우선순위 제안

### P1. 규칙 분석 일반화

먼저 해야 할 일:

- import 추론 대상을 더 늘리기
- alias/path mapping 프로젝트에 대한 fallback 전략 추가
- 규칙 scaffold 에 사용자 수정 가이드를 더 보강하기

이유:

- 2단계 범용성을 가장 직접적으로 올립니다.

### P2. 입력/검증 범위 확장

다음으로 해야 할 일:

- OpenAPI 2.0, YAML, 외부 ref 대응 여부 결정
- config validation 추가
- lint/schema validation 도입

이유:

- 실사용 입력 범위를 넓히려면 이 단계가 필요합니다.

### P3. 생성 구조 확장

필수로 해야 할 일:

- wrapper grouping 확장
- react-query 같은 상위 레이어 생성 여부 결정
- output layout 규칙 확장

이유:

- 현재 구조가 고정적인 만큼, 확장 전략을 따로 설계해야 합니다.

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
- 2단계는 기본 규칙 문서화는 가능하지만 일반화가 더 필요함
- 3단계는 `schema.ts + 태그 폴더 내부 엔드포인트별 DTO/API`까지 동작하지만 지원 범위는 MVP 수준임

즉 이 저장소는 “목표와 다른 프로젝트”가 아니라, “MVP v2 기준 핵심 경로는 구현됐고 이제 입력 범위 확장과 규칙 일반화가 남은 프로젝트”입니다.
