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

        // # Select post draft
        await expect(element(by.id('channel_screen'))).toBeVisible();
        await element(by.id('post_input')).tap();
    });

    it('should render emoji_suggestion component', async () => {
        // # Type ":" to activate emoji suggestions
        await expect(element(by.id('autocomplete.emoji_suggestion.list'))).not.toExist();
        await element(by.id('post_input')).typeText(':');

        // * Expect emoji suggestions to render
        await expect(element(by.id('autocomplete.emoji_suggestion.list'))).toExist();
    });

    it('should render at_mention component', async () => {
        // # Type "@" to activate at mention autocomplete
        await expect(element(by.id('autocomplete.at_mention.list'))).not.toExist();
        await element(by.id('post_input')).typeText('@');

        // * Expect at mention autocomplete to render
        await expect(element(by.id('autocomplete.at_mention.list'))).toExist();
    });

    it('should render channel_mention component', async () => {
        // # Type "~" to activate channel mention autocomplete
        await expect(element(by.id('autocomplete.channel_mention.list'))).not.toExist();
        await element(by.id('post_input')).typeText('~');

        // * Expect channel mention to render
        await expect(element(by.id('autocomplete.channel_mention.list'))).toExist();
    });

    it('should render slash_suggestion component', async () => {
        // # Type "/" to activate slash command suggestions
        await expect(element(by.id('autocomplete_slash_suggestion'))).not.toExist();
        await element(by.id('post_input')).typeText('/');

        // * Expect slash suggestions to render
        await expect(element(by.id('autocomplete_slash_suggestion'))).toExist();
    });
});
