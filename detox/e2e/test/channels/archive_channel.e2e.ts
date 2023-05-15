// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelDropdownMenuScreen,
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Archive Channel', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
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

    it('MM-T4932_1 - should be able to archive a public channel and confirm', async () => {
        // # Open a public channel screen, open channel info screen, and tap on archive channel option and confirm
        const {channel: publicChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'O', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, publicChannel.id);
        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelScreen.open(channelsCategory, publicChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.archivePublicChannel({confirm: true});

        // * Verify on channel screen and post draft archived message is displayed
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.postDraftArchived).toBeVisible();
        await expect(element(by.text('You are viewing an archived channel. New messages cannot be posted.'))).toBeVisible();

        // # Tap on close channel button, open browse channels screen, tap on channel dropdown, tap on archived channels menu item, and search for the archived public channel
        await ChannelScreen.postDraftArchivedCloseChannelButton.tap();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.channelDropdownTextPublic.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
        await BrowseChannelsScreen.searchInput.replaceText(publicChannel.name);

        // * Verify search returns the archived public channel item
        await wait(timeouts.ONE_SEC);
        await expect(BrowseChannelsScreen.getChannelItemDisplayName(publicChannel.name)).toHaveText(publicChannel.display_name);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4932_2 - should be able to archive a public channel and cancel', async () => {
        // # Open a public channel screen, open channel info screen, and tap on archive channel option and cancel
        const {channel: publicChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'O', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, publicChannel.id);
        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelScreen.open(channelsCategory, publicChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.archivePublicChannel({confirm: false});

        // * Verify still on channel info screen
        await ChannelInfoScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4932_3 - should be able to archive a private channel and confirm', async () => {
        // # Open a private channel screen, open channel info screen, and tap on archive channel option and confirm
        const {channel: privateChannel} = await Channel.apiCreateChannel(siteOneUrl, {type: 'P', teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privateChannel.id);
        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelScreen.open(channelsCategory, privateChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.archivePrivateChannel({confirm: true});

        // * Verify on channel screen and post draft archived message is displayed
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.postDraftArchived).toBeVisible();
        await expect(element(by.text('You are viewing an archived channel. New messages cannot be posted.'))).toBeVisible();

        // # Tap on close channel button, open browse channels screen, tap on channel dropdown, tap on archived channels menu item, and search for the archived private channel
        await ChannelScreen.postDraftArchivedCloseChannelButton.tap();
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.channelDropdownTextPublic.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
        await BrowseChannelsScreen.searchInput.replaceText(privateChannel.name);

        // * Verify search returns the archived private channel item
        await wait(timeouts.ONE_SEC);
        await expect(BrowseChannelsScreen.getChannelItemDisplayName(privateChannel.name)).toHaveText(privateChannel.display_name);

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });
});
