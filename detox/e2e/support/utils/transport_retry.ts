// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type ApiResult = {error?: unknown; status?: number};

export const NETWORK_RETRY_ATTEMPTS = 4;
export const NETWORK_RETRY_DELAY_MS = 2000; // timeouts.TWO_SEC (non-LOW_BANDWIDTH_MODE)

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const TIMEOUT_STATUS = new Set([0, 520, 522, 524]);

export const isTransportFailure = (result: ApiResult): boolean => {
    if (!result.error) {
        return false;
    }
    if (result.status !== undefined && TIMEOUT_STATUS.has(result.status)) {
        return true;
    }
    const message = typeof result.error === 'string'
        ? result.error
        : String((result.error as {message?: unknown}).message ?? result.error);
    const normalizedMessage = message.toLowerCase();
    return normalizedMessage.includes('timeout') ||
        normalizedMessage.includes('524') ||
        normalizedMessage.includes('aggregateerror') ||
        normalizedMessage.includes('no response from server');
};

/**
 * Wall-clock ceiling for the whole retry sequence.
 *
 * The client already spends up to RETRY_BUDGET_MS (90s) retrying one request
 * internally, so an attempt count alone lets this helper multiply that into more
 * than Jest's 300s hook budget. Measured: CI run 32543957273, iOS shard 3 — a
 * beforeAll spent all 300s on two attempts of the same POST and reported only
 * "Exceeded timeout of 300000 ms for a hook".
 */
export const TRANSPORT_RETRY_BUDGET_MS = 120_000;

export type TransportRetryOptions = {
    delayMs?: number;

    /**
     * Whether replaying `operation` is safe.
     *
     * Required, with no default, so that every call site states it: a transport
     * failure means we never saw a response, so a write may already have been
     * committed and replaying it duplicates the record. Reads, and writes that are
     * idempotent by construction (a PUT of a full config, a lock write keyed on a
     * fixed name), pass `true`. A create — a post, a channel, a file upload — is
     * NOT idempotent and must either pass `false` (fail fast, let the caller
     * reconcile) or justify `allowDuplicateWrites`.
     */
    idempotent: boolean;

    /**
     * Retry a non-idempotent operation anyway, because a duplicate is harmless or
     * unobservable for this caller. Say why at the call site.
     */
    allowDuplicateWrites?: boolean;

    /** Identifies the operation in the give-up log line. */
    label?: string;
};

export const withTransportRetry = async <T>(
    operation: () => Promise<T>,
    {delayMs = NETWORK_RETRY_DELAY_MS, idempotent, allowDuplicateWrites = false, label = 'operation'}: TransportRetryOptions,
): Promise<T> => {
    const startedAt = Date.now();
    let result = await operation();

    if (!idempotent && !allowDuplicateWrites) {
        return result;
    }

    for (let attempt = 1; attempt < NETWORK_RETRY_ATTEMPTS && isTransportFailure(result as ApiResult); attempt++) {
        const elapsed = Date.now() - startedAt;
        if (elapsed + delayMs >= TRANSPORT_RETRY_BUDGET_MS) {
            // eslint-disable-next-line no-console
            console.warn(`[withTransportRetry] ${label}: retry budget spent after ${elapsed}ms on attempt ${attempt}; returning the transport failure`);
            return result;
        }

        // eslint-disable-next-line no-await-in-loop -- retries are sequential by definition
        await wait(delayMs);

        // eslint-disable-next-line no-await-in-loop
        result = await operation();
    }

    return result;
};
