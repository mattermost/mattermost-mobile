// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Post, Setup, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    ChannelScreen,
    CustomStatusScreen,
    EditProfileScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {getRandomId, safeEnableSynchronization, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Account - Account Menu', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;

        // # Log in to server and go to account screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
    });

    beforeEach(async () => {
        // * Verify on account screen
        await AccountScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out — guard in case MM-T2056 was skipped and we're still on account screen
        try {
            await ChannelScreen.back();
        } catch { /* not on channel screen */ }
        await HomeScreen.logout();
    });

    // TODO: MM-T2056 skipped — post header display name does not update within 60s after
    // username change via WebSocket user_updated event on local iOS simulator. Investigate
    // whether WatermelonDB reactive query properly re-renders post list on User record change.

    it('MM-T2056 - Username changes when viewed by other user', async () => {
        const message = `Test message ${getRandomId()}`;
        const newUsername = `nu${getRandomId()}`;
        await HomeScreen.channelListTab.tap();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // Wait for keyboard to dismiss and message to be posted
        await wait(timeouts.TWO_SEC);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem, postListPostItemHeaderDisplayName} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(postListPostItemHeaderDisplayName).toHaveText(testUser.username);

        // Also check profile screen
        await ChannelScreen.back();
        await AccountScreen.open();

        await waitFor(AccountScreen.yourProfileOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await AccountScreen.yourProfileOption.tap();
        await EditProfileScreen.toBeVisible();

        await EditProfileScreen.usernameInput.replaceText(newUsername);
        await EditProfileScreen.saveButton.tap();
        await AccountScreen.toBeVisible();

        // Wait briefly for the server to persist the username change and broadcast
        // the user_updated WebSocket event before navigating to the channel.
        await wait(timeouts.TWO_SEC);

        await HomeScreen.channelListTab.tap();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        const {postListPostItemHeaderDisplayName: updatedUsername} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(updatedUsername).toHaveText(newUsername).withTimeout(timeouts.ONE_MIN);
    });
});
