import {
  commonOpenApiUrlsFrom,
  isLikelyOpenApiJsonUrl,
} from './source-url-candidates.mjs';
import {
  createFetchSignal,
  describeFetchError,
  formatHttpResponseFailure,
  getResponseHeader,
  isAuthFailureReason,
  isJsonContentType,
  isTimeoutError,
} from './source-url-http-utils.mjs';
import { validateOpenApiJson } from './source-url-validation.mjs';

export {
  commonOpenApiUrlsFrom,
  createFetchSignal,
  describeFetchError,
  formatHttpResponseFailure,
  getResponseHeader,
  isAuthFailureReason,
  isJsonContentType,
  isLikelyOpenApiJsonUrl,
  isTimeoutError,
  validateOpenApiJson,
};
