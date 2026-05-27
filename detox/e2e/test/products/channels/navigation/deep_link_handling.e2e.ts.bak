// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Tests for deep link handling with Expo Router
 * for channels, permalinks, and user profiles.
 *
 * Proposed in issue #YAS-159
 */

import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';
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
    PermalinkScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, device} from 'detox';

describe('Deep Link Handling', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testPost: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // Create a post for permalink testing
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: channel.id,
            message: `Test post for deep link ${getRandomId()}`,
        });
        testPost = post;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    beforeEach(async () => {
        // Ensure we're on channel list screen before each test
        await ChannelListScreen.toBeVisible();
    });

    it('should navigate to channel from deep link when app is backgrounded', async () => {
        // # Launch app with channel deep link
        const deepLink = `mattermost://${serverOneUrl}/channels/${testChannel.team_id}/${testChannel.name}`;

        await device.launchApp({
            newInstance: false,
            url: deepLink,
        });

        // * Verify navigated to channel
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
    });

    it('should navigate to permalink from deep link on cold start', async () => {
        // # Terminate app completely
        await device.terminateApp();
        await wait(timeouts.ONE_SEC);

        // # Launch app with permalink deep link
        const deepLink = `mattermost://${serverOneUrl}/channels/${testChannel.team_id}/${testChannel.name}/${testPost.id}`;

        await device.launchApp({
            newInstance: true,
            url: deepLink,
        });

        // * Verify navigated to permalink
        await wait(timeouts.THREE_SEC);
        await PermalinkScreen.toBeVisible();
    });

    it('should handle deep link to non-existent channel gracefully', async () => {
        // # Launch app with invalid channel deep link
        const deepLink = `mattermost://${serverOneUrl}/channels/${testChannel.team_id}/nonexistent-channel`;

        await device.launchApp({
            newInstance: false,
            url: deepLink,
        });

        // * Verify app doesn't crash and shows appropriate state
        await wait(timeouts.TWO_SEC);

        // Should either show channel list or error state
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
    });

    it('should navigate to user profile from deep link', async () => {
        // # Launch app with user profile deep link
        const deepLink = `mattermost://${serverOneUrl}/messages/${testUser.id}`;

        await device.launchApp({
            newInstance: false,
            url: deepLink,
        });

        // * Verify navigated to direct message with user
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.toBeVisible();
    });

    it('should handle deep link during active navigation', async () => {
        // # Open a different channel first
        const {channel: otherChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testChannel.team_id,
            name: `deeplink-test-${getRandomId()}`,
            displayName: `DeepLink Test ${getRandomId()}`,
            type: 'O',
        });

        await ChannelScreen.open(channelsCategory, otherChannel.name);
        await ChannelScreen.toBeVisible();

        // # Launch with deep link to original channel
        const deepLink = `mattermost://${serverOneUrl}/channels/${testChannel.team_id}/${testChannel.name}`;

        await device.launchApp({
            newInstance: false,
            url: deepLink,
        });

        // * Verify navigated to target channel
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
    });

    it('should preserve navigation state when handling deep link', async () => {
        // # Open channel info to create navigation stack
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.toBeVisible();

        // # Launch with deep link
        const deepLink = `mattermost://${serverOneUrl}/channels/${testChannel.team_id}/${testChannel.name}`;

        await device.launchApp({
            newInstance: false,
            url: deepLink,
        });

        // * Verify channel is displayed correctly
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
    });

    it('should handle malformed deep links without crashing', async () => {
        // # Launch app with malformed deep link
        const deepLink = 'mattermost://invalid-url-format';

        await device.launchApp({
            newInstance: false,
            url: deepLink,
        });

        // * Verify app doesn't crash
        await wait(timeouts.TWO_SEC);

        // App should remain in stable state
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
    });
});
