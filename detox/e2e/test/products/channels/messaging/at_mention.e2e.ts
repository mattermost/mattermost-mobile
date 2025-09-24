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
import {Alert} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - At-Mention', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let testOtherUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        ({user: testOtherUser} = await User.apiCreateUser(siteOneUrl));
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, testOtherUser.id, testChannel.id);

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

    it('MM-T4874_1 - should post at-mention as lowercase', async () => {
        // # Open a channel screen and post a message with lowercase at-mention
        const camelCaseUsernameMessage = `Message @${testUser.username.substring(0, 1).toUpperCase()}${testUser.username.substring(1)}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(camelCaseUsernameMessage);

        // * Verify at-mention is posted as lowercase
        const {post: lowerCasePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(lowerCasePost.id, `Message @${testUser.username.toLowerCase()}`);

        // # Post a message with uppercase at-mention
        const upperCaseUsernameMessage = `Message @${testOtherUser.username.toUpperCase()}`;
        await ChannelScreen.postMessage(upperCaseUsernameMessage);

        // * Verify at-mention is posted as lowercase
        const {post: upperCasePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(upperCasePost.id, `Message @${testOtherUser.username.toLowerCase()}`);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4874_2 - should display confirmation dialog when posting @all, @channel, and @here', async () => {
        // # Add more users to the channel, open a channel screen, and post @all
        [...Array(3).keys()].forEach(async (key) => {
            const {user} = await User.apiCreateUser(siteOneUrl, {prefix: `a-${key}-`});
            await Team.apiAddUserToTeam(siteOneUrl, user.id, testTeam.id);
            await Channel.apiAddUserToChannel(siteOneUrl, user.id, testChannel.id);
        });
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.replaceText('@all');
        await ChannelScreen.sendButton.tap();

        // * Verify confirmation dialog is displayed
        await expect(Alert.confirmSendingNotificationsTitle).toBeVisible();

        // # Tap on confirm button
        await Alert.confirmButton.tap();

        // * Verify @all is posted
        const {post: atAllPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(atAllPost.id, '@all');

        // # Post @channel
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.postInput.replaceText('@channel');
        await ChannelScreen.sendButton.tap();

        // * Verify confirmation dialog is displayed
        await expect(Alert.confirmSendingNotificationsTitle).toBeVisible();

        // # Tap on confirm button
        await Alert.confirmButton.tap();

        // * Verify @channel is posted
        const {post: atChannelPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(atChannelPost.id, '@channel');

        // # Post @here
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.postInput.replaceText('@here');
        await ChannelScreen.sendButton.tap();

        // * Verify confirmation dialog is displayed
        await expect(Alert.confirmSendingNotificationsTitle).toBeVisible();

        // # Tap on confirm button
        await Alert.confirmButton.tap();

        // * Verify @here is posted
        const {post: atHerePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(atHerePost.id, '@here');

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4874_3 - should be able to open user profile by tapping on at-mention', async () => {
        // # Open a channel screen, post a message with at-mention, and tap on at-mention
        const message = `@${testUser.username}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await element(by.text(message)).tap({x: 5, y: 10});
        await wait(timeouts.ONE_SEC);

        // * Verify on user profile screen
        await UserProfileScreen.toBeVisible();
        await expect(UserProfileScreen.getUserProfilePicture(testUser.id)).toBeVisible();
        await expect(UserProfileScreen.userDisplayName).toHaveText(`@${testUser.username}`);

        // # Go back to channel list screen
        await UserProfileScreen.close();
        await ChannelScreen.back();
    });
});
