// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    CreateOrEditChannelScreen,
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Smoke Test - Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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

    it('MM-T4774_1 - should be able to join a new channel and switch to an existing channel', async () => {
        // # As admin, create a new channel so that user can join, then open browse channels screen and join the new channel
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(channel.name);
        await BrowseChannelsScreen.searchInput.tapReturnKey();
        await wait(timeouts.FOUR_SEC);
        await BrowseChannelsScreen.getChannelItem(channel.name).multiTap(2);
        await ChannelScreen.closeScheduledMessageTooltip();

        // * Verify on newly joined channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);
        await expect(ChannelScreen.introDisplayName).toHaveText(channel.display_name);

        // # Go back to channel list screen and switch to an existing channel
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify on the other channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4774_2 - should be able to create a channel and create a direct message', async () => {
        // # Open create channel screen and create a new channel
        const displayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.typeText(displayName);
        await wait(timeouts.FOUR_SEC);
        await CreateOrEditChannelScreen.clickonCreateButton();

        // * Verify on newly created public channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(displayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(displayName);

        // # As admin, create a new user to open direct message with, then go back to channel list screen, open create direct message screen and open direct message with new user
        const {user: newUser} = await User.apiCreateUser(siteOneUrl);
        const newUserDisplayName = newUser.username;
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);
        await ChannelScreen.back();
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();
        await CreateDirectMessageScreen.searchInput.replaceText(newUserDisplayName);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.getUserItem(newUser.id).tap();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on direct message channel screen for the new user
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(newUserDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(newUserDisplayName);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4774_3 - should be able to post a message in a channel', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

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

        // # Open channel info screen, open edit channel screen, edit channel info, and save changes
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();
        await CreateOrEditChannelScreen.headerInput.typeText('\nheader1\nheader2');
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Verify on channel info screen and changes have been saved
        await ChannelInfoScreen.toBeVisible();
        await expect(element(by.text(`Channel header: ${testChannel.display_name.toLowerCase()}\nheader1\nheader2`))).toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4774_5 - should be able to favorite and mute a channel', async () => {
        // # Open a channel screen, open channel info screen, tap on favorite action to favorite the channel, and tap on mute action to mute the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.favoriteAction.tap();
        await ChannelInfoScreen.muteAction.tap();

        // * Verify channel is favorited and muted
        await expect(ChannelInfoScreen.unfavoriteAction).toBeVisible();
        await expect(ChannelInfoScreen.unmuteAction).toBeVisible();

        // # Tap on favorited action to unfavorite the channel and tap on muted action to unmute the channel
        await ChannelInfoScreen.unfavoriteAction.tap();
        await ChannelInfoScreen.unmuteAction.tap();

        // * Verify channel is unfavorited and unmuted
        await expect(ChannelInfoScreen.favoriteAction).toBeVisible();
        await expect(ChannelInfoScreen.muteAction).toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4774_6 - should be able to archive and leave a channel', async () => {
        // # Open a channel screen, open channel info screen, and tap on archive channel option and confirm
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelScreen.open(channelsCategory, channel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.archivePublicChannel({confirm: true});

        // * Verify on channel screen and post draft archived message is displayed
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.postDraftArchived).toBeVisible();
        await expect(element(by.text('You are viewing an archived channel. New messages cannot be posted.'))).toBeVisible();

        // # Open channel info screen, and tap on leave channel option and confirm
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.leaveChannel({confirm: true});

        // * Verify on channel list screen and the channel left by the user does not appear on the list
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.getChannelItem(channelsCategory, channel.name)).not.toExist();
    });
});
