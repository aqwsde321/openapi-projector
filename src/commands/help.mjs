const commands = [
  ['help', '도움말 출력'],
  ['init', 'standalone 기본 config/bootstrap 생성'],
  ['download', 'OpenAPI 원본 다운로드'],
  ['catalog', 'endpoint catalog 와 변경 요약 생성'],
  ['generate', 'review 문서와 raw endpoint helper 생성'],
  ['rules', 'project 규칙 분석 문서와 scaffold 생성'],
  ['project', '규칙 기반 project 후보 코드 생성'],
  ['apply', 'project 후보를 실제 src 로 반영'],
  ['refresh', 'download + catalog + generate'],
];

const helpCommand = {
  name: 'help',
  async run() {
    console.log('openapi-tool');
    console.log('');
    console.log('Usage:');
    console.log('  node openapi-tool/bin/openapi-tool.mjs <command>');
    console.log('');
    console.log('Commands:');
    for (const [name, description] of commands) {
      console.log(`  ${name.padEnd(10, ' ')} ${description}`);
    }
    console.log('');
    console.log('Execution model:');
    console.log('  - config 탐색 순서: openapi.config.jsonc -> openapi/config/project.jsonc -> config/project.jsonc');
    console.log('  - review 산출물은 openapi/review 아래에 생성됩니다.');
    console.log('  - project 후보는 openapi/project 아래에 생성됩니다.');
    console.log('  - 새 프로젝트 시작은 init 명령으로 bootstrap 합니다.');
  },
};

export { helpCommand };
