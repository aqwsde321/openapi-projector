import { failureMark, successMark, warningMark } from '../../cli/format.mjs';

function createDoctorReporter() {
  const lines = ['openapi-projector doctor', ''];
  let ok = true;

  const report = {
    lines,
    pass(message) {
      lines.push(`${successMark()} [PASS] ${message}`);
    },
    warn(message) {
      lines.push(`${warningMark()} [WARN] ${message}`);
    },
    fail(message) {
      ok = false;
      lines.push(`${failureMark()} [FAIL] ${message}`);
    },
    skip(message) {
      lines.push(`- [SKIP] ${message}`);
    },
    get ok() {
      return ok;
    },
    print() {
      console.log(lines.join('\n'));
    },
    finish() {
      lines.push('');
      lines.push(ok ? 'Result: ready enough to continue.' : 'Result: fix failed checks before continuing.');
      report.print();
      return { ok };
    },
  };

  return report;
}

export { createDoctorReporter };
