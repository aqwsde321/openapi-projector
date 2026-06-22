import { createSimpleSpec } from '#test-support/fixtures/openapi.mjs';

function createOpenApiFetchResponse({
  body = createSimpleSpec(),
  status = 200,
  statusText = 'OK',
  headers = { 'content-type': 'application/json' },
} = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get(name) {
        return normalizedHeaders.get(String(name).toLowerCase()) ?? null;
      },
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

function createOpenApiFetchMock(handler = () => createOpenApiFetchResponse()) {
  const calls = [];
  const fetchMock = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options);
  };
  fetchMock.calls = calls;
  return fetchMock;
}

async function withGlobalFetch(fetchImplementation, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await callback(fetchImplementation);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

export {
  createOpenApiFetchMock,
  createOpenApiFetchResponse,
  withGlobalFetch,
};
