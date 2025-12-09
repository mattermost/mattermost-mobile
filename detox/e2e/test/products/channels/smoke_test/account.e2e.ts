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
    AccountScreen,
    ClockDisplaySettingsScreen,
    CustomStatusScreen,
    DisplaySettingsScreen,
    EditProfileScreen,
    EmailNotificationSettingsScreen,
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    MentionNotificationSettingsScreen,
    NotificationSettingsScreen,
    PushNotificationSettingsScreen,
    ServerScreen,
    SettingsScreen,
    ThemeDisplaySettingsScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Smoke Test - Account', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

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
        await HomeScreen.logout();
    });

    it('MM-T5114_1 - should be able to set user presence and custom status', async () => {
        // # Tap on user presence option and tap on online user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.onlineUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for online user status
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('online')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('online')).toHaveText('Online');

        // # Open custom status screen, pick an emoji and type in custom status, and tap on done button
        const customStatusEmojiName = 'clown_face';
        const customStatusText = `Status ${getRandomId()}`;
        const customStatusDuration = 'today';
        await CustomStatusScreen.open();
        await wait(timeouts.ONE_SEC);
        await CustomStatusScreen.openEmojiPicker('default', true);
        await EmojiPickerScreen.searchInput.replaceText(customStatusEmojiName);
        await element(by.text('🤡')).tap();
        await wait(timeouts.ONE_SEC);
        await CustomStatusScreen.statusInput.replaceText(customStatusText);
        await CustomStatusScreen.doneButton.tap();

        // * Verify on account screen and custom status is set
        await AccountScreen.toBeVisible();
        const {accountCustomStatusEmoji, accountCustomStatusText, accountCustomStatusExpiry} = AccountScreen.getCustomStatus(customStatusEmojiName, customStatusDuration);
        await expect(accountCustomStatusEmoji).toBeVisible();
        await expect(accountCustomStatusText).toHaveText(customStatusText);
        await expect(accountCustomStatusExpiry).toBeVisible();

        // # Tap on clear button for custom status from display field
        await AccountScreen.customStatusClearButton.tap();

        // * Verify custom status is cleared from account screen
        const defaultStatusText = 'Set a custom status';
        await expect(accountCustomStatusEmoji).not.toExist();
        await expect(accountCustomStatusText).toHaveText(defaultStatusText);
        await expect(accountCustomStatusExpiry).not.toExist();
    });

    it('MM-T5114_2 - should be able to edit profile', async () => {
        // # Open edit profile screen, edit fields, and tap on save button
        const suffix = getRandomId(3);
        await EditProfileScreen.open();
        await EditProfileScreen.firstNameInput.replaceText(`${testUser.first_name}${suffix}`);
        await EditProfileScreen.scrollView.tap({x: 1, y: 1});
        await EditProfileScreen.scrollView.scroll(100, 'down');
        await EditProfileScreen.usernameInput.clearText();
        await EditProfileScreen.usernameInput.typeText(`${testUser.username}${suffix}`);
        await EditProfileScreen.saveButton.tap();

        // * Verify on account screen and user full name and username are updated
        await AccountScreen.toBeVisible();
        const {userInfoUserDisplayName, userInfoUsername} = AccountScreen.getUserInfo(testUser.id);
        await expect(userInfoUserDisplayName).toHaveText(`${testUser.first_name}${suffix} ${testUser.last_name} (${testUser.nickname})`);
        await expect(userInfoUsername).toHaveText(`@${testUser.username}${suffix}`);

        // # Open edit profile screen, revert back to original field values, and tap on save button
        await EditProfileScreen.open();
        await EditProfileScreen.firstNameInput.replaceText(testUser.first_name);
        await EditProfileScreen.scrollView.tap({x: 1, y: 1});
        await EditProfileScreen.scrollView.scroll(100, 'down');
        await EditProfileScreen.usernameInput.clearText();
        await EditProfileScreen.usernameInput.typeText(testUser.username);
        await EditProfileScreen.saveButton.tap();

        // * Verify on account screen and user full name and username are reverted back to original values
        await AccountScreen.toBeVisible();
        await expect(userInfoUserDisplayName).toHaveText(`${testUser.first_name} ${testUser.last_name} (${testUser.nickname})`);
        await expect(userInfoUsername).toHaveText(`@${testUser.username}`);
    });

    it('MM-T5114_3 - should be able to set notification settings', async () => {
        // # Open settings screen, open notification settings screen, open mention notification settings screen, type in keywords, tap on back button, and go back to mention notification settings screen
        const keywords = `${getRandomId()}`;
        await SettingsScreen.open();
        await NotificationSettingsScreen.open();
        await MentionNotificationSettingsScreen.open();
        await MentionNotificationSettingsScreen.keywordsInput.replaceText(keywords);
        await MentionNotificationSettingsScreen.keywordsInput.typeText(',');
        await MentionNotificationSettingsScreen.back();
        await MentionNotificationSettingsScreen.open();
        await expect(element(by.text(keywords))).toBeVisible();

        // # Go back to notification settings screen, open push notification settings screen, tap on mentions only option, tap on mobile away option, tap on back button, and go back to notification settings screen
        await MentionNotificationSettingsScreen.back();
        await PushNotificationSettingsScreen.open();
        await PushNotificationSettingsScreen.mentionsOnlyOption.tap();
        await PushNotificationSettingsScreen.mobileAwayOption.tap();
        await PushNotificationSettingsScreen.back();
        await PushNotificationSettingsScreen.open();

        // * Verify mentions only option and mobile away option are selected
        await expect(PushNotificationSettingsScreen.mentionsOnlyOptionSelected).toBeVisible();
        await expect(PushNotificationSettingsScreen.mobileAwayOptionSelected).toBeVisible();

        // # Go back to notification settings screen, open email notification settings screen, tap on immediately option, and tap on back button
        await PushNotificationSettingsScreen.back();
        await EmailNotificationSettingsScreen.open();
        await EmailNotificationSettingsScreen.immediatelyOption.tap();
        await EmailNotificationSettingsScreen.back();

        // * Verify on notification settings screen and immediately is set
        await NotificationSettingsScreen.toBeVisible();
        await expect(NotificationSettingsScreen.emailNotificationsOptionInfo).toHaveText('Immediately');

        // # Go back to account screen
        await NotificationSettingsScreen.back();
        await SettingsScreen.close();
    });

    it('MM-T5114_4 - should be able to set display settings', async () => {
        // # Open settings screen, open display settings screen, open theme display settings screen, and tap on denim option
        await SettingsScreen.open();
        await DisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.open();
        await ThemeDisplaySettingsScreen.denimOption.tap();

        // * Verify on display settings screen and denim is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.themeOptionInfo).toHaveText('Denim');

        // # Open clock display settings screen, select twelve hour option, and tap on back button
        await ClockDisplaySettingsScreen.open();
        await ClockDisplaySettingsScreen.twelveHourOption.tap();
        await ClockDisplaySettingsScreen.back();

        // * Verify on display settings screen and twelve hour is set
        await DisplaySettingsScreen.toBeVisible();
        await expect(DisplaySettingsScreen.clockDisplayOptionInfo).toHaveText('12-hour');

        // # Go back to account screen
        await DisplaySettingsScreen.back();
        await SettingsScreen.close();
    });
});
