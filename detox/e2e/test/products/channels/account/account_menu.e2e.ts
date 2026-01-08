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
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Account - Account Menu', () => {
    const serverOneDisplayName = 'Server 1';
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
        // # Log out
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T4988_1 - should match elements on account screen', async () => {
        // * Verify basic elements on account screen
        const {userInfoProfilePicture, userInfoUserDisplayName, userInfoUsername} = AccountScreen.getUserInfo(testUser.id);
        await expect(userInfoProfilePicture).toBeVisible();
        await expect(userInfoUserDisplayName).toHaveText(`${testUser.first_name} ${testUser.last_name} (${testUser.nickname})`);
        await expect(userInfoUsername).toHaveText(`@${testUser.username}`);
        await expect(AccountScreen.userPresenceOption).toBeVisible();
        await expect(AccountScreen.setStatusOption).toBeVisible();
        await expect(AccountScreen.yourProfileOption).toBeVisible();
        await expect(AccountScreen.settingsOption).toBeVisible();
        await expect(AccountScreen.logoutOption).toBeVisible();
    });

    it('MM-T4988_2 - should be able to set user presence', async () => {
        // # Tap on user presence option and tap on offline user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.offlineUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for offline user status
        await AccountScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
        await waitFor(AccountScreen.getUserPresenceIndicator('offline')).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(AccountScreen.getUserPresenceLabel('offline')).toHaveText('Offline');

        // # Tap on user presence option and tap on do not disturb user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.dndUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for do no disturb user status
        await AccountScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
        await waitFor(AccountScreen.getUserPresenceIndicator('dnd')).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(AccountScreen.getUserPresenceLabel('dnd')).toHaveText('Do Not Disturb');

        // # Tap on user presence option and tap on away user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.awayUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for away user status
        await AccountScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
        await waitFor(AccountScreen.getUserPresenceIndicator('away')).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(AccountScreen.getUserPresenceLabel('away')).toHaveText('Away');

        // # Tap on user presence option and tap on online user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.onlineUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for online user status
        await AccountScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
        await waitFor(AccountScreen.getUserPresenceIndicator('online')).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(AccountScreen.getUserPresenceLabel('online')).toHaveText('Online');
    });

    it('MM-T4988_3 - should be able to go to custom status screen', async () => {
        // # Tap on set status option
        await AccountScreen.setStatusOption.tap();

        // * Verify on custom status screen
        await CustomStatusScreen.toBeVisible();

        // # Go back to account screen
        await CustomStatusScreen.close();
    });

    it('MM-T4988_4 - should be able to go to edit profile screen', async () => {
        // # Tap on your profile option
        await AccountScreen.yourProfileOption.tap();

        // * Verify on edit profile screen
        await EditProfileScreen.toBeVisible();

        // # Go back to account screen
        await EditProfileScreen.close();
    });

    it('MM-T4988_5 - should be able to go to settings screen', async () => {
        // # Tap on settings option
        await AccountScreen.settingsOption.tap();

        // * Verify on settings screen
        await SettingsScreen.toBeVisible();

        // # Go back to account screen
        await SettingsScreen.close();
    });

    it('MM-T3472 - should be able to add Nickname', async () => {
        const nickname = 'nickname';
        const existingNickname = testUser.nickname;

        await AccountScreen.yourProfileOption.tap();
        await EditProfileScreen.toBeVisible();

        await EditProfileScreen.nicknameInput.replaceText(nickname);
        await EditProfileScreen.saveButton.tap();
        await AccountScreen.toBeVisible();

        // Verify nickname is shown in the profile screen
        await AccountScreen.yourProfileOption.tap();
        await EditProfileScreen.toBeVisible();
        await waitFor(EditProfileScreen.nicknameInput).toHaveText(nickname).withTimeout(timeouts.TEN_SEC);

        // Verify nickname is different than previous nickname
        const {user} = await User.apiGetUserById(siteOneUrl, testUser.id);
        if (existingNickname === user.nickname) {
            throw new Error('Nickname was not updated');
        }

        // # Go back to account screen
        await EditProfileScreen.close();

    });

    it('MM-T3472 - should show error when Username is updated with invalid characters', async () => {
        await AccountScreen.yourProfileOption.tap();
        await EditProfileScreen.toBeVisible();

        await EditProfileScreen.usernameInput.typeText('+new');
        await EditProfileScreen.saveButton.tap();

        await waitFor(AccountScreen.accountScreen).not.toBeVisible().withTimeout(timeouts.TWO_SEC);
        await EditProfileScreen.toBeVisible();
        await expect(EditProfileScreen.usernameInputError).toHaveText('Username must begin with a letter, and contain between 3 to 22 lowercase characters made up of numbers, letters, and the symbols \".\", \"-\", and \"_\".');
        await EditProfileScreen.close();
    });

    it('MM-T2056 - Username changes when viewed by other user', async () => {
        const message = `Test message ${getRandomId()}`;
        const newUsername = `newusername${getRandomId()}`;
        await HomeScreen.channelListTab.tap();
        await ChannelScreen.open(testChannel);
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

        await AccountScreen.yourProfileOption.tap();
        await EditProfileScreen.toBeVisible();

        await EditProfileScreen.usernameInput.replaceText(newUsername);
        await EditProfileScreen.saveButton.tap();
        await AccountScreen.toBeVisible();

        await HomeScreen.channelListTab.tap();
        await ChannelScreen.open(testChannel);

        const {postListPostItemHeaderDisplayName: updatedUsername} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(updatedUsername).toHaveText(newUsername);
    });
});
