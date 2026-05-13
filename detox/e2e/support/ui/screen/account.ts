// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
    ProfilePicture,
} from '@support/ui/component';
import {HomeScreen} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        const timeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;
        await waitFor(this.accountScreen).toExist().withTimeout(timeout);

        return this.accountScreen;
    };

    open = async () => {
        // Dismiss any lingering "Logout not complete" dialog left over from a
        // previous test's logout. This can happen on both platforms when the
        // server was unreachable and the handler in logout() didn't dismiss it.
        try {
            await waitFor(Alert.logoutNotCompleteTitle).toBeVisible().withTimeout(timeouts.TWO_SEC);
            console.log('[debug:2a0143] AccountScreen.open dismissed lingering "Logout not complete" dialog'); // eslint-disable-line no-console
            await Alert.continueAnywayButton.tap();
            await wait(timeouts.HALF_SEC);
        } catch { /* not present */ }

        // Dismiss iOS native dialogs whose backdrop UIView covers the full screen and
        // blocks all hit-tests — these appear after login on iOS 26+ (iPad and iPhone).
        if (device.getPlatform() === 'ios') {
            // "Save Password?" sheet (iOS Password manager autofill offer after login).
            // Tap "Not Now" directly — if the native sheet is present it will be dismissed;
            // if not present Detox throws "element not found" which we catch safely.
            try {
                await element(by.label('Not Now')).tap();
                await wait(timeouts.HALF_SEC);
            } catch { /* not present */ }
            // "Notifications cannot be received from this server" alert.
            try {
                await element(by.label('Okay')).tap();
                await wait(timeouts.HALF_SEC);
            } catch { /* not present */ }
        }

        // Dismiss the "Scheduled Posts" tutorial tooltip before tapping the account tab.
        // On iPad the channel is always co-visible with the sidebar, so this tooltip appears
        // after every fresh login and sits directly over the account tab (bottom-right corner).
        // Wait up to TWO_SEC for the tooltip to finish animating in before dismissing.
        try {
            await waitFor(element(by.id('scheduled_post.tooltip.close.button'))).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await element(by.id('scheduled_post.tooltip.close.button')).tap();
            await waitFor(element(by.id('scheduled_post.tooltip.close.button'))).not.toExist().withTimeout(timeouts.FIVE_SEC);
        } catch { /* no tooltip */ }
        try {
            await waitFor(element(by.id('scheduled_post_tutorial_tooltip.close'))).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await element(by.id('scheduled_post_tutorial_tooltip.close')).tap();
            await waitFor(element(by.id('scheduled_post_tutorial_tooltip.close'))).not.toExist().withTimeout(timeouts.FIVE_SEC);
        } catch { /* no admin-variant tooltip */ }

        try {
            await waitFor(HomeScreen.accountTab).toExist().withTimeout(timeouts.TEN_SEC);
            await HomeScreen.accountTab.tap();
            return this.toBeVisible();
        } catch (error) {
            // If account tab is not found, the app might already be on account screen or in unexpected state
            // Try to verify if we're already on account screen
            try {
                await waitFor(this.accountScreen).toExist().withTimeout(timeouts.TWO_SEC);
                return this.accountScreen;
            } catch {
                // Re-throw original error if we're not on account screen either
                throw error;
            }
        }
    };

    logout = async (serverDisplayName: string | null = null) => {
        await this.logoutOption.tap();
        if (serverDisplayName) {
            await expect(Alert.logoutTitle(serverDisplayName)).toBeVisible();
        }
        await Alert.logoutButton.tap();

        // Handle "Logout not complete" dialog that appears when the server is
        // unreachable (offline, slow network). Tap "Continue Anyway" to force
        // the logout to complete instead of leaving the app in a stuck state.
        // Use TEN_SEC because CI environments can be slow to show this dialog.
        try {
            await waitFor(Alert.logoutNotCompleteTitle).toBeVisible().withTimeout(timeouts.TEN_SEC);
            console.log('[debug:2a0143] AccountScreen.logout dismissed "Logout not complete" dialog'); // eslint-disable-line no-console
            await Alert.continueAnywayButton.tap();
        } catch {
            // Dialog didn't appear — normal logout completed successfully
        }

        await waitFor(this.accountScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const accountScreen = new AccountScreen();
export default accountScreen;
