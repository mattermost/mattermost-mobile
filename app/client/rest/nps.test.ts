// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientNPSMix} from './nps';

describe('ClientNPS', () => {
    let client: ClientNPSMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('npsGiveFeedbackAction', async () => {
        const expectedUrl = `${client.getPluginRoute(General.NPS_PLUGIN_ID)}/api/v1/give_feedback`;
        const expectedOptions = {
            method: 'post',
        };

        await client.npsGiveFeedbackAction();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
