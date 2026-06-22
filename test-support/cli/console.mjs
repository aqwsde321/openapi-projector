import { Writable } from 'node:stream';

async function captureConsoleLog(callback) {
  const originalLog = console.log;
  const lines = [];
  console.log = (...args) => {
    lines.push(args.join(' '));
  };

  try {
    const result = await callback();
    return {
      result,
      output: lines.join('\n'),
    };
  } finally {
    console.log = originalLog;
  }
}

function createWritableCapture({ forceColor = false, isTTY = false } = {}) {
  let output = '';
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });

  if (isTTY) {
    Object.defineProperty(writable, 'isTTY', {
      configurable: true,
      value: true,
    });
  }

  if (forceColor) {
    Object.defineProperty(writable, 'forceColor', {
      configurable: true,
      value: true,
    });
  }

  return {
    output: () => output,
    writable,
  };
}

export { captureConsoleLog, createWritableCapture };
