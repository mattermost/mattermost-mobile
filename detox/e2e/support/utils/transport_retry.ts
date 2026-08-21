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
    return message.includes('timeout') || message.includes('524');
};

export type TransportRetryOptions = {delayMs?: number};

export const withTransportRetry = async <T>(
    operation: () => Promise<T>,
    {delayMs = NETWORK_RETRY_DELAY_MS}: TransportRetryOptions = {},
): Promise<T> => {
    let result = await operation();

    for (let attempt = 1; attempt < NETWORK_RETRY_ATTEMPTS && isTransportFailure(result as ApiResult); attempt++) {
        // eslint-disable-next-line no-await-in-loop -- retries are sequential by definition
        await wait(delayMs);

        // eslint-disable-next-line no-await-in-loop
        result = await operation();
    }

    return result;
};
