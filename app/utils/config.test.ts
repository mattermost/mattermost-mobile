// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {hasReliableWebsocket, isZeroPersistenceConfig} from './config';

describe('Config utilities', () => {
    test('hasReliableWebsocket', () => {
        expect(hasReliableWebsocket('5.8.0')).toBe(false);
        expect(hasReliableWebsocket('6.4.0', 'false')).toBe(false);
        expect(hasReliableWebsocket('6.4.0', 'true')).toBe(true);
        expect(hasReliableWebsocket('9.4.0', 'false')).toBe(true);
        expect(hasReliableWebsocket('9.4.0', 'true')).toBe(true);
        expect(hasReliableWebsocket('9.4.0')).toBe(true);
    });

    describe('isZeroPersistenceConfig', () => {
        it('returns false when config is undefined', () => {
            expect(isZeroPersistenceConfig(undefined)).toBe(false);
        });

        it('returns false when ephemeral mode is disabled', () => {
            expect(isZeroPersistenceConfig({
                MobileEphemeralModeEnabled: 'false',
                MobileEphemeralModeAutoCacheCleanupDays: '0',
            } as ClientConfig)).toBe(false);
        });

        it('returns false when ephemeral mode is enabled with a non-zero cleanup days value', () => {
            expect(isZeroPersistenceConfig({
                MobileEphemeralModeEnabled: 'true',
                MobileEphemeralModeAutoCacheCleanupDays: '5',
            } as ClientConfig)).toBe(false);
        });

        it('returns true when ephemeral mode is enabled with 0 cleanup days', () => {
            expect(isZeroPersistenceConfig({
                MobileEphemeralModeEnabled: 'true',
                MobileEphemeralModeAutoCacheCleanupDays: '0',
            } as ClientConfig)).toBe(true);
        });
    });
});
