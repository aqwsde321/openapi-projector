const commands = [
  ['help', '도움말 출력'],
  ['init', 'standalone 기본 config/bootstrap 생성'],
  ['download', 'OpenAPI 원본 다운로드'],
  ['catalog', 'endpoint catalog 와 변경 요약 생성'],
  ['generate', 'review 문서와 schema.ts 생성'],
  ['rules', 'project 규칙 분석 문서와 scaffold 생성'],
  ['project', '규칙 기반 DTO/API 후보 코드 생성'],
  ['refresh', 'download + catalog + generate'],
  ['doctor', '로컬 설정과 대상 프로젝트 준비 상태 점검'],
  ['prepare', 'init 필요 시 생성 후 refresh + rules + project 실행'],
];

const helpCommand = {
  name: 'help',
  async run() {
    console.log('openapi-projector');
    console.log('');
    console.log('Usage:');
    console.log('  node ./bin/openapi-tool.mjs <command>');
    console.log('  openapi-projector <command>');
    console.log('  openapi-tool <command>');
    console.log('  node ./bin/openapi-tool.mjs --project-root /path/to/service-app <command>');
    console.log('  pnpm run openapi:<command>');
    console.log('  npm run openapi:<command>');
    console.log('');
    console.log('First-time setup:');
    console.log('  1. .openapi-projector.local.example.jsonc 를 .openapi-projector.local.jsonc 로 복사합니다.');
    console.log('  2. projectRoot 를 대상 프로젝트 절대 경로로 채웁니다.');
    console.log('  3. 필요하면 initDefaults.sourceUrl 도 같이 채웁니다.');
    console.log('  4. doctor 로 점검한 뒤 prepare 를 실행합니다.');
    console.log('');
    console.log('Commands:');
    for (const [name, description] of commands) {
      console.log(`  ${name.padEnd(10, ' ')} ${description}`);
    }
    console.log('');
    console.log('Execution model:');
    console.log('  - help/doctor 를 제외한 모든 명령은 target project root 가 필요합니다.');
    console.log('  - 우선순위: --project-root -> .openapi-projector.local.jsonc -> .openapi-tool.local.jsonc');
    console.log('  - config 탐색 순서: openapi.config.jsonc -> openapi/config/project.jsonc -> config/project.jsonc');
    console.log('  - review 산출물은 openapi/review 아래에 생성됩니다.');
    console.log('  - project 후보는 openapi/project 아래에 생성됩니다.');
    console.log('  - generate 는 review 문서와 schema.ts 만 생성합니다.');
    console.log('  - project 는 schema.ts + 태그 폴더 내부 엔드포인트별 DTO/API 후보 코드를 생성합니다.');
    console.log('  - 실제 반영은 사람이거나 AI가 openapi/project 결과를 보고 진행합니다.');
    console.log('  - 새 프로젝트 시작은 init 명령으로 bootstrap 합니다.');
    console.log('');
    console.log('Recommended flow:');
    console.log('  doctor -> prepare');
    console.log('  상세 단계가 필요하면 init -> refresh -> rules -> project');
    console.log('');
    console.log('Docs:');
    console.log('  - 대상 프로젝트 사용법: docs/02-target-project-usage.md');
    console.log('  - 현재 구조/설정값: docs/10-current-structure-and-config.md');
  },
};

export { helpCommand };
