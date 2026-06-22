import test from 'node:test';

import { renderOperationSection } from '#src/generator/render-operation-section.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  createObjectQueryParamsOperation,
  createObjectQueryParamsSpec,
} from '#test-support/project/render-operation-fixture.mjs';

test('renderOperationSection flattens object query parameters into request DTO fields', () => {
  const rendered = renderOperationSection({
    spec: createObjectQueryParamsSpec(),
    operation: createObjectQueryParamsOperation(),
    functionName: 'getPaymentList',
    dtoImportPath: './get-payment-list.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'fetchAPI',
    runtimeCallStyle: 'url-config',
  });

  assertMatchesAll(rendered.dtoSource, [
    /export interface GetPaymentListRequestDto \{/,
    /page\?: number;/,
    /size\?: number;/,
    /status\?: string;/,
    /keyword\?: string;/,
  ]);
  assertDoesNotMatchAny(rendered.dtoSource, [
    /export interface PageRequest \{/,
    /export interface PaymentListFilter \{/,
    /pageable\?: PageRequest;/,
    /condition\?: PaymentListFilter;/,
  ]);
  assertMatchesAll(rendered.apiSource, [
    /"page": requestDto\["page"\]/,
    /"status": requestDto\["status"\]/,
  ]);
});
