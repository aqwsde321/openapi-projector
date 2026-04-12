# core

이 폴더는 OpenAPI 파싱, review 산출물 생성, project rules 생성, project 후보 생성 같은 재사용 가능한 핵심 로직을 담는 자리입니다.

현재는 `openapi-utils.mjs` 에 공용 유틸리티가 들어 있습니다.
명령별 세부 생성 로직은 `../commands/*` 에 있고, 점진적으로 core/io 계층으로 분리할 수 있습니다.
