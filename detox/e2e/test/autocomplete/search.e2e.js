// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toChannelScreen} from '@support/ui/screen';

import {Setup} from '@support/server_api';

describe('Autocomplete', () => {
    beforeAll(async () => {
        const {user} = await Setup.apiInit();
        await toChannelScreen(user);
    });

    beforeEach(async () => {
        await device.reloadReactNative();
        await element(by.id('channel.search.button')).tap();
    });

    it('should render at_mention component', async () => {
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await element(by.id('search_from')).tap();
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();
    });

    it('should render channel_mention component', async () => {
        await expect(element(by.id('autocomplete.channel_mention.list'))).not.toExist();
        await element(by.id('search_in')).tap();
        await expect(element(by.id('autocomplete.channel_mention.list'))).toExist();
    });

    it('should render date_suggestion component', async () => {
        await expect(element(by.id('autocomplete_date_suggestion'))).not.toExist();
        await element(by.id('search_before')).tap();
        await expect(element(by.id('autocomplete_date_suggestion'))).toExist();
    });
});
