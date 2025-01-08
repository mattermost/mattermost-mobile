// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientTosMix} from './tos';

describe('ClientTos', () => {
    let client: ClientTosMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('updateMyTermsOfServiceStatus', async () => {
        const termsOfServiceId = 'tos_id';
        const accepted = true;
        const expectedUrl = `${client.getUserRoute('me')}/terms_of_service`;
        const expectedOptions = {
            method: 'post',
            body: {termsOfServiceId, accepted},
        };

        await client.updateMyTermsOfServiceStatus(termsOfServiceId, accepted);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTermsOfService', async () => {
        const expectedUrl = `${client.urlVersion}/terms_of_service`;
        const expectedOptions = {
            method: 'get',
        };

        await client.getTermsOfService();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
