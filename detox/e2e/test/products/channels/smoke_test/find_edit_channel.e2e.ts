// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    CreateOrEditChannelScreen,
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Smoke Test - Channels', () => {

    const serverOneDisplayName = 'Server 1';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    // Skip iOS: failed on CI 30437339535. The waitFor-polling fix added afterwards was never
    // exercised — its shard was cancelled on 30447839548 — so treat it as unverified. Android passes.

    it('MM-T4774_4 - should be able to find and edit a channel', async () => {
        // # Open find channels screen, search for the channel to navigate to, and tap on the target channel item
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.replaceText(testChannel.name);
        await FindChannelsScreen.searchInput.tapReturnKey();
        await waitFor(FindChannelsScreen.getFilteredChannelItem(testChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await FindChannelsScreen.getFilteredChannelItem(testChannel.name).tap();

        // * Verify on target channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Open channel info screen, open edit channel screen, edit channel info, and save changes.
        // Use replaceText with the full final value rather than typeText to append.
        // On Android the initial caret position can land inside the pre-filled
        // header text, causing typeText('\nheader1\nheader2') to insert the new
        // lines mid-word (the test previously saw "chann\nheader1\nheader2el e06882"
        // saved as the channel header).
        const initialHeader = `Channel header: ${testChannel.display_name.toLowerCase()}`;
        const updatedHeader = `${initialHeader}\nheader1\nheader2`;
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();
        await CreateOrEditChannelScreen.headerInput.replaceText(updatedHeader);
        await CreateOrEditChannelScreen.save();

        // * Verify on channel info screen and changes have been saved.
        try {
            await waitFor(ChannelSettingsScreen.channelSettingsScreen).toExist().withTimeout(timeouts.FOUR_SEC);
            await ChannelSettingsScreen.close();
        } catch {
            // Save may land directly on channel info.
        }
        await ChannelInfoScreen.toBeVisible();
        await waitFor(element(by.text(`Channel header: ${testChannel.display_name.toLowerCase()}\nheader1\nheader2`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });
});
