// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
    ProfilePicture,
} from '@support/ui/component';
import {HomeScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class AccountScreen {
    testID = {
        userInfoPrefix: 'account.user_info.',
        customStatusPrefix: 'account.custom_status.',
        accountScreen: 'account.screen',
        userPresenceOption: 'account.user_presence.option',
        setStatusOption: 'account.custom_status.option',
        yourProfileOption: 'account.your_profile.option',
        settingsOption: 'account.settings.option',
        logoutOption: 'account.logout.option',
        onlineUserStatusOption: 'user_status.online.option',
        awayUserStatusOption: 'user_status.away.option',
        dndUserStatusOption: 'user_status.dnd.option',
        offlineUserStatusOption: 'user_status.offline.option',
        customStatusFailureMessage: 'account.custom_status.failure_message',
        customStatusClearButton: 'account.custom_status.clear.button',
    };

    accountScreen = element(by.id(this.testID.accountScreen));
    userPresenceOption = element(by.id(this.testID.userPresenceOption));
    setStatusOption = element(by.id(this.testID.setStatusOption));
    yourProfileOption = element(by.id(this.testID.yourProfileOption));
    settingsOption = element(by.id(this.testID.settingsOption));
    logoutOption = element(by.id(this.testID.logoutOption));
    onlineUserStatusOption = element(by.id(this.testID.onlineUserStatusOption));
    awayUserStatusOption = element(by.id(this.testID.awayUserStatusOption));
    dndUserStatusOption = element(by.id(this.testID.dndUserStatusOption));
    offlineUserStatusOption = element(by.id(this.testID.offlineUserStatusOption));
    customStatusFailureMessage = element(by.id(this.testID.customStatusFailureMessage));
    customStatusClearButton = element(by.id(this.testID.customStatusClearButton));

    getUserInfo = (userId: string) => {
        const userInfoTestId = `${this.testID.userInfoPrefix}${userId}`;
        const userInfoProfilePictureMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.userInfoPrefix, userId);
        const userInfoUserDisplayNameMatcher = by.id(`${userInfoTestId}.display_name`);
        const userInfoUsernameMatcher = by.id(`${userInfoTestId}.username`);

        return {
            userInfoProfilePicture: element(userInfoProfilePictureMatcher),
            userInfoUserDisplayName: element(userInfoUserDisplayNameMatcher),
            userInfoUsername: element(userInfoUsernameMatcher),
        };
    };

    getUserPresenceIndicator = (status: string) => {
        return element(by.id(`user_status.indicator.${status}`)).atIndex(0);
    };

    getUserPresenceLabel = (status: string) => {
        return element(by.id(`user_status.label.${status}`)).atIndex(0);
    };

    getCustomStatus = (emojiName: string, duration: string) => {
        const accountCustomStatusEmojiMatcher = by.id(`${this.testID.customStatusPrefix}custom_status_emoji.${emojiName}`);
        const accountCustomStatusTextMatcher = by.id(`${this.testID.customStatusPrefix}custom_status_text`);
        const accountCustomStatusExpiryMatcher = by.id(`${this.testID.customStatusPrefix}custom_status_duration.${duration}.custom_status_expiry`);

        return {
            accountCustomStatusEmoji: element(accountCustomStatusEmojiMatcher),
            accountCustomStatusText: element(accountCustomStatusTextMatcher),
            accountCustomStatusExpiry: element(accountCustomStatusExpiryMatcher),
        };
    };

    toBeVisible = async () => {
        await waitFor(this.accountScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.accountScreen;
    };

    open = async () => {
        // # Open account screen
        await waitFor(HomeScreen.accountTab).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await HomeScreen.accountTab.tap();

        return this.toBeVisible();
    };

    logout = async (serverDisplayName: string | null = null) => {
        await this.logoutOption.tap();
        if (serverDisplayName) {
            await expect(Alert.logoutTitle(serverDisplayName)).toBeVisible();
        }
        await Alert.logoutButton.tap();
        await waitFor(this.accountScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const accountScreen = new AccountScreen();
export default accountScreen;
