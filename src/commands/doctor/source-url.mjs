import { isConfiguredSourceUrl } from '../../core/project-workspace.mjs';

const SOURCE_URL_CHECK_SKIPPED_MESSAGE =
  'sourceUrl reachability was not checked. Run doctor --check-url to verify it.';

async function checkSourceUrl(sourceUrl) {
  const response = await fetch(sourceUrl, { method: 'GET' });
  if (!response.ok) {
    return `HTTP ${response.status} ${response.statusText}`;
  }
  return null;
}

async function checkDoctorSourceUrl({
  checkUrl,
  configuredMessage,
  fail,
  lines,
  missingFix,
  missingMessage,
  pass,
  skip,
  sourceUrl,
}) {
  if (!isConfiguredSourceUrl(sourceUrl)) {
    fail(missingMessage);
    lines.push(missingFix);
    return;
  }

  pass(configuredMessage(sourceUrl));
  if (!checkUrl) {
    skip(SOURCE_URL_CHECK_SKIPPED_MESSAGE);
    return;
  }

  try {
    const sourceUrlError = await checkSourceUrl(sourceUrl);
    if (sourceUrlError) {
      fail(`sourceUrl is not reachable: ${sourceUrlError}`);
    } else {
      pass('sourceUrl is reachable.');
    }
  } catch (error) {
    fail(`sourceUrl check failed: ${error.message}`);
  }
}

export { checkDoctorSourceUrl };
