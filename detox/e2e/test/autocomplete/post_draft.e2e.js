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
    });

    it('should render emoji_suggestion component', async () => {
        await expect(element(by.id('channel_screen'))).toBeVisible();
        await element(by.id('post_input')).tap();

        await expect(element(by.id('autocomplete_emoji_suggestion'))).not.toExist();
        await element(by.id('post_input')).typeText(':');

        await expect(element(by.id('autocomplete_emoji_suggestion'))).toExist();
    });

    it('should render at_mention component', async () => {
        await expect(element(by.id('channel_screen'))).toExist();
        await element(by.id('post_input')).tap();

        await expect(element(by.id('autocomplete_at_mention'))).not.toExist();
        await element(by.id('post_input')).typeText('@');

        await expect(element(by.id('autocomplete_at_mention'))).toExist();
    });

    it('should render channel_mention component', async () => {
        await expect(element(by.id('channel_screen'))).toExist();
        await element(by.id('post_input')).tap();

        await expect(element(by.id('autocomplete_channel_mention'))).not.toExist();
        await element(by.id('post_input')).typeText('~');

        await expect(element(by.id('autocomplete_channel_mention'))).toExist();
    });

    it('should render slash_suggestion component', async () => {
        await expect(element(by.id('channel_screen'))).toBeVisible();
        await element(by.id('post_input')).tap();

        await expect(element(by.id('autocomplete_slash_suggestion'))).not.toExist();
        await element(by.id('post_input')).typeText('/');

        await expect(element(by.id('autocomplete_slash_suggestion'))).toExist();
    });
});
