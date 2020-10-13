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

        // # Enter search screen
        await element(by.id('channel.search.button')).tap();
    });

    it('MM-T3393_1 should render at_mention component', async () => {
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();

        // # Tap "from:" modifier
        await element(by.id('search_from.section')).tap();

        // * Expect at mention to render
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();
    });

    it('MM-T3393_2 should render channel_mention component', async () => {
        await expect(element(by.id('autocomplete.channel_mention.list'))).not.toExist();

        // # Tap "in:" modifier
        await element(by.id('search_in.section')).tap();

        // * Expect channel mention to render
        await expect(element(by.id('autocomplete.channel_mention.list'))).toExist();
    });

    it('MM-T3393_3 should render date_suggestion component', async () => {
        await expect(element(by.id('autocomplete.date_suggestion'))).not.toExist();

        // # Tap "before:" modifier
        await element(by.id('search_before.section')).tap();

        // * Expect date suggestion to render
        await expect(element(by.id('autocomplete.date_suggestion'))).toExist();
    });
});
