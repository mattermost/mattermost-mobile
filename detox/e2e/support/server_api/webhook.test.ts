// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {requireWebhookServer} from './webhook';

describe('requireWebhookServer', () => {
    afterEach(() => {
        delete process.env.WEBHOOK_SIDECAR;
    });

    it('should not call the sidecar when e2e-test-stack runs it inside the server', async () => {
        process.env.WEBHOOK_SIDECAR = 'e2e-test-stack';

        // Unresolvable from here: a request would fail.
        await requireWebhookServer('http://webhook:3000');
    });

    it('should still refuse an empty URL on e2e-test-stack', async () => {
        process.env.WEBHOOK_SIDECAR = 'e2e-test-stack';
        await assert.rejects(requireWebhookServer(''), /WEBHOOK_BASE_URL is empty/);
    });

    it('should check the sidecar from the runner otherwise', async () => {
        delete process.env.WEBHOOK_SIDECAR;
        await assert.rejects(requireWebhookServer('http://localhost:1'), /Webhook sidecar is not healthy/);
    });
});
