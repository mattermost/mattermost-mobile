// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Channel Info', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4928_1 - should match elements on channel info screen', async () => {
        // # Open a channel screen and open channel info screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();

        // * Verify basic elements on channel info screen
        await expect(ChannelInfoScreen.closeButton).toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(testChannel.display_name);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(`Channel purpose: ${testChannel.display_name.toLowerCase()}`);
        await expect(element(by.text(`Channel header: ${testChannel.display_name.toLowerCase()}`))).toBeVisible();
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();
        await expect(ChannelInfoScreen.muteAction).toBeVisible();
        await expect(ChannelInfoScreen.joinStartCallAction).toBeVisible();
        await expect(ChannelInfoScreen.ignoreMentionsOptionToggledOff).toBeVisible();
        await ChannelInfoScreen.scrollView.scrollTo('bottom');
        await expect(ChannelInfoScreen.pinnedMessagesOption).toBeVisible();
        await expect(ChannelInfoScreen.copyChannelLinkOption).toBeVisible();
        await ChannelInfoScreen.scrollView.scrollTo('bottom');
        await expect(ChannelInfoScreen.editChannelOption).toBeVisible();
        await ChannelInfoScreen.scrollView.scrollTo('bottom');
        await expect(ChannelInfoScreen.leaveChannelOption).toBeVisible();
        await waitFor(ChannelInfoScreen.archiveChannelOption).toBeVisible().whileElement(by.id(ChannelInfoScreen.testID.scrollView)).scroll(50, 'down');
        await expect(ChannelInfoScreen.archiveChannelOption).toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4928_2 - should be able to view channel info by tapping intro channel info action', async () => {
        // # Open a channel screen and tap on intro channel info action
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.introChannelInfoAction.tap();

        // * Verify on channel info screen
        await ChannelInfoScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4928_3 - should be able to view channel info from channel quick actions', async () => {
        // # Open a channel screen, tap on channel quick actions button, and tap on channel info action
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.channelQuickActionsButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.channelInfoQuickAction.tap();

        // * Verify on channel info screen
        await ChannelInfoScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
