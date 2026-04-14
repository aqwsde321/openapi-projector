# Requirements Specification

이 문서는 `openapi-workflow`의 기능 요구사항을 정의합니다.

## 범위

입력:

- OpenAPI 3.0/3.1 JSON 또는 Swagger/OpenAPI URL
- 적용 대상 프론트엔드 프로젝트 구조
- 사람이 검토/수정 가능한 프로젝트 규칙 파일

출력:

- review용 catalog / docs / `schema.ts`
- 프로젝트 규칙 분석 문서
- 프로젝트 맞춤 DTO/API 후보 코드
- 실제 반영 가능한 apply 대상 파일

## 시스템 요구사항

- Node.js 환경에서 CLI로 실행 가능해야 합니다.
- 현재 작업 디렉터리 기준으로 대상 프로젝트를 해석해야 합니다.
- 설정 파일은 JSONC 형식을 지원해야 합니다.
- 대상 프로젝트에 생성되는 작업 폴더와 도구 저장소는 분리되어야 합니다.

## 기능 요구사항

### A. 초기화와 설정

### FR-A1. bootstrap 생성

- 시스템은 `init` 명령으로 대상 프로젝트에 `openapi/` 작업 폴더를 생성해야 합니다.
- 시스템은 최소한 아래 파일을 bootstrap 해야 합니다.
  - `openapi/config/project.jsonc`
  - `openapi/config/project-rules.jsonc`
  - `openapi/.gitignore`

### FR-A2. config discovery

- 시스템은 아래 우선순위로 프로젝트 설정 파일을 탐색해야 합니다.
  1. `openapi.config.jsonc`
  2. `openapi/config/project.jsonc`
  3. `config/project.jsonc`

### FR-A3. 기본 설정값

- 시스템은 설정 파일 누락 시 기본값을 보완할 수 있어야 합니다.
- 기본 출력 경로는 `openapi/*` 구조를 기준으로 제공해야 합니다.

### B. 결정 가능한 산출물 생성

### FR-B1. OpenAPI 원본 다운로드

- 시스템은 `sourceUrl` 기준으로 OpenAPI 원본을 다운로드할 수 있어야 합니다.
- 다운로드 결과는 `sourcePath`에 저장되어야 합니다.
- `sourceUrl`이 비어 있거나 placeholder 이면 명확한 오류를 반환해야 합니다.

### FR-B2. endpoint catalog 생성

- 시스템은 OpenAPI `paths`를 기준으로 endpoint catalog를 생성해야 합니다.
- 각 endpoint는 고유 `id`, method, path, summary, tags를 가져야 합니다.
- 시스템은 변경 비교를 위해 fingerprint 기반 요약을 생성해야 합니다.

### FR-B3. review 문서 생성

- 시스템은 각 endpoint에 대해 사람이 읽을 수 있는 문서를 생성해야 합니다.
- review 문서에는 최소한 아래 정보가 포함되어야 합니다.
  - method / path
  - summary / description
  - parameter 정보
  - request body media type
  - success response media type

### FR-B4. review schema 생성

- 시스템은 OpenAPI 스펙만으로 결정 가능한 review용 `schema.ts` 파일을 생성해야 합니다.
- MVP v2는 OpenAPI 3.0/3.1 JSON 입력만 지원합니다.
- DTO 생성은 `openapi-typescript` 기반으로 처리해야 합니다.

### FR-B5. 재생성 가능성

- 같은 스펙과 같은 설정이면 같은 review 산출물이 생성되어야 합니다.

### C. 프로젝트 규칙 분석과 문서화

### FR-C1. 프로젝트 구조 분석

- 시스템은 대상 프로젝트 구조를 분석해 `fetchAPI`, request config 타입 import 후보를 요약해야 합니다.
- `src/entities`가 없을 때도 `src` fallback 으로 동작해야 합니다.

### FR-C2. 규칙 분석 문서 생성

- 시스템은 사람이 읽고 판단할 수 있는 분석 문서를 생성해야 합니다.
- 분석 문서에는 최소한 아래가 포함되어야 합니다.
  - 공통 API import 후보
  - request config type 후보
  - wrapper/layout 고정 기본값

### FR-C3. 규칙 scaffold 생성

- 시스템은 프로젝트 규칙 파일 초안을 생성해야 합니다.
- 규칙 파일은 사람이 수정 가능한 JSONC 형식이어야 합니다.

### FR-C4. AI/사람 협업 가능성

- 규칙 파일과 분석 문서는 사람이 직접 수정하거나 AI가 후처리할 수 있어야 합니다.
- 시스템은 규칙이 코드 내부 하드코딩으로만 존재하지 않도록 해야 합니다.

### D. 프로젝트 맞춤 코드 생성

### FR-D1. 규칙 기반 후보 생성

- 시스템은 OpenAPI 기반 `schema.ts`와 규칙 파일을 함께 사용해 프로젝트 맞춤 DTO/API 후보를 생성해야 합니다.

### FR-D2. 반영 전 후보 영역 유지

- 시스템은 실제 앱 코드 수정 전, 별도 후보 디렉터리에 결과를 생성해야 합니다.
- 후보 결과는 사람이 검토 가능한 형태여야 합니다.

### FR-D3. 프로젝트 컨벤션 반영

- 시스템은 최소한 아래 규칙을 생성 결과에 반영할 수 있어야 합니다.
  - fetch helper import 경로와 symbol
  - request config 타입
  - adapter 호출 방식
  - wrapper 분할 방식
  - tag 파일 네이밍
  - schema/DTO/API 출력 레이아웃

### FR-D4. manifest / summary 생성

- 시스템은 생성된 파일 목록과 apply 대상 경로를 manifest 및 summary 문서로 남겨야 합니다.

### E. 실제 반영

### FR-E1. apply

- 시스템은 후보 산출물을 실제 target src 경로로 복사 적용할 수 있어야 합니다.
- apply는 manifest 기준으로 동작해야 합니다.

### FR-E2. review-first 원칙

- 시스템은 기본적으로 `apply` 전 단계에서 충분한 검토가 가능하도록 워크플로우를 유지해야 합니다.

## 비기능 요구사항

### NFR-1. 결정성

- 스펙 기반 생성은 가능한 한 deterministic 해야 합니다.

### NFR-2. 명시성

- 프로젝트 의존 규칙은 코드보다 문서/설정으로 먼저 드러나야 합니다.

### NFR-3. 안전성

- 기본 워크플로우는 실제 앱 코드 직접 수정보다 후보 생성과 리뷰를 우선해야 합니다.

### NFR-4. 재사용성

- 동일 도구를 여러 서비스 프로젝트에 적용할 수 있어야 합니다.

### NFR-5. 유지보수성

- 명령 구현, 공용 유틸, 설정 템플릿은 분리되어 관리되어야 합니다.

## 단계별 완료 기준

### 1단계 완료 기준

- `download`, `catalog`, `generate`가 동작한다.
- OpenAPI만으로 review 문서와 `schema.ts`가 생성된다.

### 2단계 완료 기준

- `rules`가 프로젝트 분석 문서와 규칙 파일 초안을 생성한다.
- 사람이 규칙 파일을 수정할 수 있다.

### 3단계 완료 기준

- `project`가 규칙 파일을 읽어 프로젝트 맞춤 후보 코드를 생성한다.
- `apply`가 후보 코드를 실제 반영 경로에 적용한다.

## 현재 구현 대비 판단 기준

현재 구현이 충분하다고 보려면 아래 질문에 모두 “예”가 나와야 합니다.

- review `schema.ts` 생성이 OpenAPI만으로 안정적으로 되는가
- 규칙 분석 결과가 특정 프로젝트 가정에 과도하게 묶여 있지 않은가
- 규칙 파일의 주요 항목이 실제 생성 결과에 반영되는가
- 사람이 `apply` 전에 결과를 검토하고 수정할 수 있는가

이 중 일부만 만족하면 프로토타입 단계로 판단합니다.
