const ANSI_GREEN = '\x1b[32m';
const ANSI_RED = '\x1b[31m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_RESET = '\x1b[0m';

function shouldUseColor(stream = process.stdout) {
  if (stream?.forceColor) {
    return true;
  }

  return Boolean(stream?.isTTY && !process.env.NO_COLOR);
}

function colorize(text, color, stream) {
  if (!shouldUseColor(stream)) {
    return text;
  }

  return `${color}${text}${ANSI_RESET}`;
}

function successMark(stream = process.stdout) {
  return colorize('✓', ANSI_GREEN, stream);
}

function failureMark(stream = process.stderr) {
  return colorize('x', ANSI_RED, stream);
}

function warningMark(stream = process.stdout) {
  return colorize('!', ANSI_YELLOW, stream);
}

function formatSuccess(message, stream = process.stdout) {
  return `${successMark(stream)} ${message}`;
}

function formatFailure(message, stream = process.stderr) {
  return `${failureMark(stream)} ${message}`;
}

function formatWarning(message, stream = process.stdout) {
  return `${warningMark(stream)} ${message}`;
}

export {
  colorize,
  failureMark,
  formatFailure,
  formatSuccess,
  formatWarning,
  shouldUseColor,
  successMark,
  warningMark,
};
