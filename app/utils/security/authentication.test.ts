// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm, {AuthenticationOutcome} from '@mattermost/react-native-emm';

import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import {getAuthenticationOutcome, probeDeviceSecured} from './authentication';
import {AuthenticationSource, DEVICE_SECURED_RETRY_DELAY} from './constants';

jest.mock('@mattermost/react-native-emm', () => ({
    AuthenticationOutcome: {
        Failed: 'E_AUTH_FAILED',
        Cancelled: 'E_CANCELLED',
        Indeterminate: 'E_INDETERMINATE',
    },
    isDeviceSecured: jest.fn(),
}));

const rejectWith = (outcome: AuthenticationOutcome) => {
    const error = new Error(outcome) as Error & {outcome: AuthenticationOutcome};
    error.outcome = outcome;
    return error;
};

describe('getAuthenticationOutcome', () => {
    test('should return the outcome carried by the error', () => {
        expect(getAuthenticationOutcome(rejectWith(AuthenticationOutcome.Failed))).toBe(AuthenticationOutcome.Failed);
        expect(getAuthenticationOutcome(rejectWith(AuthenticationOutcome.Cancelled))).toBe(AuthenticationOutcome.Cancelled);
    });

    test('should treat an unrecognised error as indeterminate so it never looks like a failure', () => {
        expect(getAuthenticationOutcome(new Error('boom'))).toBe(AuthenticationOutcome.Indeterminate);
        expect(getAuthenticationOutcome(undefined)).toBe(AuthenticationOutcome.Indeterminate);
    });
});

describe('probeDeviceSecured', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        enableFakeTimers();
    });

    afterEach(() => {
        disableFakeTimers();
    });

    test('should report secured without retrying', async () => {
        jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);

        await expect(probeDeviceSecured(AuthenticationSource.SecurityManager)).resolves.toBe('secured');
        expect(Emm.isDeviceSecured).toHaveBeenCalledTimes(1);
    });

    test('should not retry a device that is genuinely not secured', async () => {
        jest.mocked(Emm.isDeviceSecured).mockResolvedValue(false);

        await expect(probeDeviceSecured(AuthenticationSource.SecurityManager)).resolves.toBe('notSecured');
        expect(Emm.isDeviceSecured).toHaveBeenCalledTimes(1);
    });

    test('should retry once and succeed when the first check cannot be performed', async () => {
        jest.mocked(Emm.isDeviceSecured).
            mockRejectedValueOnce(rejectWith(AuthenticationOutcome.Indeterminate)).
            mockResolvedValueOnce(true);

        const result = probeDeviceSecured(AuthenticationSource.SecurityManager);

        // Let the first rejection settle so the retry delay is actually pending.
        await new Promise(process.nextTick);
        await advanceTimers(DEVICE_SECURED_RETRY_DELAY);

        await expect(result).resolves.toBe('secured');
        expect(Emm.isDeviceSecured).toHaveBeenCalledTimes(2);
    });

    test('should report interrupted rather than notSecured when both attempts fail', async () => {
        jest.mocked(Emm.isDeviceSecured).mockRejectedValue(rejectWith(AuthenticationOutcome.Indeterminate));

        const result = probeDeviceSecured(AuthenticationSource.SecurityManager);

        await new Promise(process.nextTick);
        await advanceTimers(DEVICE_SECURED_RETRY_DELAY);

        await expect(result).resolves.toBe('interrupted');
        expect(Emm.isDeviceSecured).toHaveBeenCalledTimes(2);
    });
});
