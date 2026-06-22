# core

이 폴더는 OpenAPI 파싱, review 산출물 생성, project rules 생성, project 후보 생성 같은 재사용 가능한 핵심 로직을 담는 자리입니다.

현재는 project/workspace 설정, init/update 파일 생성, local config, 공통 텍스트/경로 유틸을 담습니다.
명령별 실행 흐름은 `../commands/*` 에 있고, OpenAPI와 project 생성 로직은 전용 폴더로 분리되어 있습니다.
