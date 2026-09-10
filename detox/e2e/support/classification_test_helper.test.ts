// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {afterEach, describe, it, mock} from 'node:test';

import {enableClassificationMarkings} from './classification_test_helper';
import System from './server_api/system';

const BASE_URL = 'http://unit-test.invalid';
const FLAG_KEY = 'FeatureFlagClassificationMarkings';

// What getResponseFromError returns when axios never gets a reply — the exact shape
// withTransportRetry hands back after spending its budget (run 34487859024, machine-22).
const DROPPED_RESPONSE = {
    error: {message: 'No response from server: timeout of 45000ms exceeded. If testing against a non-default server, set the SITE_URL environment variable.'},
    status: 0,
};
const PATCH_OK = {config: {FeatureFlags: {ClassificationMarkings: true}}};

// Script the client-config reads in order; anything past the script reads false.
const scriptFlagReads = (reads: boolean[]) => {
    return mock.method(System, 'waitForClientConfigFlag', async () => reads.shift() ?? false);
};

describe('enableClassificationMarkings', () => {
    afterEach(() => {
        mock.reset();
    });

    it('should not patch server config when the client config already reports the flag on', async () => {
        const flagReads = scriptFlagReads([true]);
        const patch = mock.method(System, 'apiPatchConfig', async () => PATCH_OK);

        await enableClassificationMarkings(BASE_URL);

        assert.equal(patch.mock.callCount(), 0);
        assert.equal(flagReads.mock.callCount(), 1);
        const preCheck = flagReads.mock.calls[0];
        assert.ok(preCheck);
        const [, key, expected, options] = preCheck.arguments;
        assert.equal(key, FLAG_KEY);
        assert.equal(expected, 'true');
        assert.equal(options?.maxAttempts, 1, 'the pre-check is a single read, not a poll');
    });

    it('should succeed when the PATCH reply is dropped but the flag reads true afterwards', async () => {
        const flagReads = scriptFlagReads([false, true]);
        const patch = mock.method(System, 'apiPatchConfig', async () => DROPPED_RESPONSE);

        await enableClassificationMarkings(BASE_URL);

        assert.equal(patch.mock.callCount(), 1, 'exactly one patch: the transport layer already retried it');
        assert.equal(flagReads.mock.callCount(), 2);
        const postCheck = flagReads.mock.calls[1];
        assert.ok(postCheck);
        assert.equal(postCheck.arguments[3]?.maxAttempts, 30, 'the post-check uses the propagation poll');
    });

    it('should throw once, without re-patching, when the PATCH reply is dropped and the flag stays off', async () => {
        scriptFlagReads([false, false]);
        const patch = mock.method(System, 'apiPatchConfig', async () => DROPPED_RESPONSE);

        await assert.rejects(
            () => enableClassificationMarkings(BASE_URL),
            (err: Error) => {
                assert.match(err.message, /config PATCH got no usable response/);
                assert.match(err.message, /timeout of 45000ms exceeded/);
                assert.match(err.message, new RegExp(`${FLAG_KEY} did not read true afterwards`));
                return true;
            },
        );

        assert.equal(patch.mock.callCount(), 1, 'a transport failure must not grow a third retry layer');
    });

    it('should return after the PATCH succeeds and the client config picks the flag up', async () => {
        const flagReads = scriptFlagReads([false, true]);
        const patch = mock.method(System, 'apiPatchConfig', async () => PATCH_OK);

        await enableClassificationMarkings(BASE_URL);

        assert.equal(patch.mock.callCount(), 1);
        assert.equal(flagReads.mock.callCount(), 2);
    });

    it('should re-patch when the PATCH succeeds but the client config does not pick the flag up', async () => {
        // pre-check false; attempt 1: patch ok, flag never propagates; attempt 2: patch ok, flag propagates.
        const flagReads = scriptFlagReads([false, false, true]);
        const patch = mock.method(System, 'apiPatchConfig', async () => PATCH_OK);
        mock.method(System, 'apiGetConfig', async () => ({config: {FeatureFlags: {ClassificationMarkings: true}}}));
        mock.method(System, 'apiGetClientConfigOld', async () => ({config: {[FLAG_KEY]: 'false'}}));
        mock.method(console, 'warn', () => undefined);

        await enableClassificationMarkings(BASE_URL);

        assert.equal(patch.mock.callCount(), 2);
        assert.equal(flagReads.mock.callCount(), 3);
    });
});
