// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toChannelScreen} from '@support/ui/screen';

import {Setup} from '@support/server_api';

describe('Autocomplete', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await toChannelScreen(user);
    });

    it('should render autocomplete in channel header edit screen', async () => {
        // # Open channel info modal
        await element(by.id('channel.title.button')).tap();

        // # Open edit channel menu
        await element(by.text('Edit Channel')).tap();

        // # Activate at_mention autocomplete
        await element(by.id('edit_channel.header.input')).typeText('@');

        // * Expect autocomplete to render
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();
    });
});
