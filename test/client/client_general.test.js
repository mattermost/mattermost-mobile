// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from 'test_helper.js';

describe('Client.General', function() {
    it('getClientConfig', async () => {
        const {client} = await TestHelper.initBasic();

        const clientConfig = await client.getClientConfig('foo');

        assert.ok(clientConfig.Version);
        assert.ok(clientConfig.BuildNumber);
        assert.ok(clientConfig.BuildDate);
        assert.ok(clientConfig.BuildHash);
    });

    it('getPing', async () => {
        const {client} = await TestHelper.initBasic();

        await client.getPing();
    });

    it('getPing - Invalid URL', async () => {
        const {client} = await TestHelper.initBasic();
        client.setUrl('https://example.com/fake/url');

        let errored;
        try {
            await client.getPing();

            errored = false;
        } catch (err) {
            errored = true;
        }

        assert.ok(errored, 'should have errored');
    });

    it('logClientError', async () => {
        const {client} = await TestHelper.initBasic();

        await client.logClientError('this is a test');
    });
});
