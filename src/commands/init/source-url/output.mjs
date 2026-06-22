const ANSI_GREEN = '\x1b[32m';
const ANSI_RED = '\x1b[31m';
const ANSI_RESET = '\x1b[0m';

function shouldUseColor(stdout) {
  if (stdout?.forceColor) {
    return true;
  }

  return Boolean(stdout?.isTTY && !process.env.NO_COLOR);
}

function colorize(text, color, stdout) {
  if (!shouldUseColor(stdout)) {
    return text;
  }

  return `${color}${text}${ANSI_RESET}`;
}

function statusMark(ok, stdout) {
  return ok ? colorize('✓', ANSI_GREEN, stdout) : colorize('x', ANSI_RED, stdout);
}

function writeUrlCheckResult(stdout, { ok, sourceUrl, detail, reason, method = 'GET' }) {
  const suffix = ok ? ` - ${detail}` : ` - ${reason}`;
  stdout.write(`${statusMark(ok, stdout)} ${method} ${sourceUrl}${suffix}\n`);
}

export { writeUrlCheckResult };
