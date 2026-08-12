// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Transport-retry helpers for the classification lock, extracted from classification_lock.ts
// so they can be unit-tested without a Detox device, simulator, or Mattermost server. This
// module is intentionally dependency-free: it must not import @support/* (which pulls in the
// detox bridge) so it runs under plain node.

export type ApiResult = {error?: unknown; status?: number};

export const NETWORK_RETRY_ATTEMPTS = 4;
export const NETWORK_RETRY_DELAY_MS = 2000; // timeouts.TWO_SEC (non-LOW_BANDWIDTH_MODE)

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// server_api helpers never throw on network failure — getResponseFromError() in
// server_api/common.ts returns {error, status: 0} when axios reports no HTTP response, and
// {error: data, status} when the server actually answered. So status === 0 is an exact
// transport-failure discriminator; anything with a real status is a considered answer from
// the server and must surface immediately rather than being retried.
export const isTransportFailure = (result: ApiResult): boolean => Boolean(result.error) && result.status === 0;

export type TransportRetryOptions = {delayMs?: number};

export const withTransportRetry = async <T extends ApiResult>(
    operation: () => Promise<T>,
    {delayMs = NETWORK_RETRY_DELAY_MS}: TransportRetryOptions = {},
): Promise<T> => {
    let result = await operation();

    for (let attempt = 1; attempt < NETWORK_RETRY_ATTEMPTS && isTransportFailure(result); attempt++) {
        // eslint-disable-next-line no-await-in-loop -- retries are sequential by definition
        await wait(delayMs);

        // eslint-disable-next-line no-await-in-loop
        result = await operation();
    }

    return result;
};
