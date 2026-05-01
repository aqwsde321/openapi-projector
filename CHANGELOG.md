# Changelog

이 파일은 `openapi-projector` npm 패키지의 사용자에게 보이는 변경 이력을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)를 느슨하게 따르고, 버전은 `package.json`의 `version` 및 Git 태그와 맞춥니다.

## 0.3.0 - 2026-05-02

### Added

- React Query 사용 프로젝트를 감지해 `project-rules.jsonc`에 `hooks` 규칙을 자동 제안하도록 추가했습니다.
- `hooks.enabled=true`일 때 GET endpoint는 `*.query.ts`, POST/PUT/PATCH/DELETE endpoint는 `*.mutation.ts` 후보를 생성하도록 추가했습니다.
- hook 후보의 query key 방식, response unwrap, `STALE_TIME` import를 조정할 수 있는 `hooks` 설정 검증을 추가했습니다.

### Changed

- 생성 요약과 프로젝트 README가 DTO/API 후보뿐 아니라 선택적 React Query hook 후보도 함께 안내하도록 업데이트했습니다.
- 기존 `project-rules.jsonc`에도 React Query 감지 결과를 바탕으로 `hooks` 기본값을 보강하되, 사용자가 명시한 `hooks.enabled=false`는 유지하도록 변경했습니다.

## 0.2.2 - 2026-05-02

### Added

- 기존 `openapi/README.md` 안내 문서만 최신 템플릿으로 갱신하는 `upgrade-docs` 명령을 추가했습니다.
- 최신 Swagger/OpenAPI 변경 비교 진입점으로 `openapi/changes.md`와 `openapi/changes.json`을 생성하도록 추가했습니다.
- CLI 성공/실패/경고 로그에 상태 표시를 추가하고, `prepare`가 실행하는 단계를 명령별로 더 명확히 표시하도록 개선했습니다.

### Changed

- 루트 README는 Swagger/OpenAPI 변경 비교를 주요 기능으로 먼저 설명하고, 생성되는 프로젝트 README도 변경 비교 문서를 DTO/API 후보 반영보다 먼저 확인하도록 정리했습니다.
- 생성되는 `openapi/README.md`를 `init` 이후 바로 볼 수 있는 빠른 시작 흐름으로 재구성했습니다.

### Removed

- 기본 변경 비교 표보다 설명력이 낮던 선택적 `oasdiff` 호환성 리포트 통합을 제거했습니다.

## 0.2.1 - 2026-04-30

### Added

- 대화형 `init`의 URL 확인이 실패했을 때 `skip` 입력으로 마지막 `sourceUrl`을 그대로 저장하고 진행할 수 있게 추가했습니다.

## 0.2.0 - 2026-04-30

### Added

- `catalog` 변경 요약에 선택적 `oasdiff` 호환성 리포트 병합을 추가했습니다.
- `summary.json`의 `externalDiff.oasdiff`와 `summary.md`의 `Compatibility Check` 섹션을 추가했습니다.
- `init` 실행 시 터미널 환경에서 기본 `sourceUrl`을 보여주고 변경 값을 입력받는 프롬프트를 추가했습니다.
- `init` 대화형 프롬프트에서 입력한 `sourceUrl`을 즉시 확인하고, 실패 시 대표 OpenAPI 경로 자동 탐색과 재입력을 지원하도록 추가했습니다.
- `init` 완료 로그에 `sourceUrl`을 나중에 수정할 설정 파일 경로와 `file://` 링크를 표시하도록 추가했습니다.
- AI에게 작업을 맡기기 전 사람이 `prepare`로 생성되는 검토 자료를 확인하는 README 안내를 추가했습니다.

### Fixed

- `oasdiff` required 모드에서 기준 파일이 없을 때 호환성 검사가 우회되지 않도록 수정했습니다.
- `oasdiff` off 모드가 기준 파일을 갱신하지 않도록 수정했습니다.
- `init --source-url` 적용 여부를 CLI 출력에서 실제 설정값으로 확인할 수 있게 수정했습니다.
- 우선순위가 높은 기존 OpenAPI config가 있을 때 `init`이 사용되지 않는 하위 config를 만들지 않도록 수정했습니다.
- 우선순위가 낮은 기존 OpenAPI config는 `init` 대상 config 생성을 막지 않도록 수정했습니다.

## 0.1.4 - 2026-04-29

### Added

- 생성 README가 소스 checkout 실행 방식과 npm 패키지 실행 방식을 구분하도록 안내를 추가했습니다.
- 생성 README의 핵심 문구와 CLI 출력에 대한 회귀 테스트를 추가했습니다.

### Changed

- 기본 OpenAPI JSON URL을 `http://localhost:8080/v3/api-docs`로 설정했습니다.
- 루트 README의 빠른 시작을 기본 `init` 중심으로 단순화했습니다.
- 생성 README의 AI 프롬프트를 접지 않고 바로 복사할 수 있게 변경했습니다.
- 생성 README에서 첫 `prepare`가 `rules` 검토 단계에서 멈추는 것이 정상임을 명확히 했습니다.
- 변경 요약의 계약 변경 라벨을 request body, response body, parameter 사용처 기준으로 구분했습니다.

### Fixed

- 변경 요약에서 schema property 사용처가 요청/응답 맥락과 맞게 표시되도록 보강했습니다.
- OpenAPI `required` 배열 변경 감지를 검증하는 테스트를 추가했습니다.

## 0.1.3 - 2026-04-29

### Fixed

- Linux 환경에서 경로 대소문자 차이로 실패하던 테스트 기대값을 수정했습니다.

## 0.1.2 - 2026-04-29

### Changed

- npm 배포 자동화 검증을 위한 릴리스 준비를 반영했습니다.

## 0.1.1 - 2026-04-29

### Added

- GitHub Actions 기반 npm Trusted Publishing 배포 흐름을 추가했습니다.
- OpenAPI 변경 이력 비교표와 후보 파일 링크를 문서화했습니다.
- 프로젝트 규칙 검증, 설정 경로 검증, flat 출력 배치, media type 선택을 추가했습니다.

### Changed

- README 사용 흐름과 프로젝트 경로 예시 문구를 정리했습니다.
- 프로젝트 엔드포인트 투영 단계를 분리해 유지보수 구조를 개선했습니다.

### Fixed

- `doctor`의 OpenAPI 원본 검증을 강화했습니다.
- 프로젝트 규칙 scaffold 갱신과 검토 게이트 동작을 안정화했습니다.
