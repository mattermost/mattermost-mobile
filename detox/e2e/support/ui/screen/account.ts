// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
    ProfilePicture,
} from '@support/ui/component';
import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelScreen, HomeScreen, LoginScreen, ServerListScreen, ServerScreen} from '@support/ui/screen';
import {isAndroid, isIos, isOptionalElementPresent, timeouts, wait, waitForElementToNotExist, waitForFirstPresent, withSynchronizationDisabled} from '@support/utils';
import {expect, waitFor} from 'detox';

import {logInfo} from '../../../../provision/log';

const TAP_VISIBLE_PCT = 75;

class AccountScreen {
    testID = {
        userInfoPrefix: 'account.user_info.',
        customStatusPrefix: 'account.custom_status.',
        accountScreen: 'account.screen',
        accountScrollView: 'account.scroll_view',
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
        customStatusText: 'account.custom_status.custom_status_text',
    };

    accountScreen = element(by.id(this.testID.accountScreen));
    accountScrollView = element(by.id(this.testID.accountScrollView));
    userPresenceOption = element(by.id(this.testID.userPresenceOption));
    setStatusOption = element(by.id(this.testID.setStatusOption));
    customStatusText = element(by.id(this.testID.customStatusText));
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

    selectUserStatus = async (option: Detox.NativeElement) => {
        await this.userPresenceOption.tap();
        await waitFor(option).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await option.tap();
        await waitForElementToNotExist(option, timeouts.TEN_SEC);
        await this.toBeVisible();
    };

    waitForUserPresence = async (status: string, label: string) => {
        await waitFor(this.getUserPresenceIndicator(status)).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.getUserPresenceLabel(status)).toHaveText(label).withTimeout(timeouts.TEN_SEC);
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
        await waitFor(this.logoutOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);

        return this.accountScreen;
    };

    /**
     * Dismisses the "Scheduled Posts" tutorial tooltip (regular and admin variants) if it is up. On iPad the channel
     * is always co-visible with the sidebar, so it appears after every fresh login and sits directly over the account
     * tab (bottom-right corner); TWO_SEC allows for it to animate in. On iOS the whole dismissal (probe, visibility
     * wait, tap and disappearance wait, for both variants) is one synchronization-disabled action, so a busy app cannot
     * stretch it; the nested probe windows are counted by the owner. Android keeps synchronization on (see
     * synchronization.ts).
     */
    private dismissScheduledPostTooltips = async () => {
        const dismiss = async () => {
            for (const closeButton of [ChannelScreen.scheduledPostTooltipCloseButton, ChannelScreen.scheduledPostTooltipCloseButtonAdminAccount]) {
                // eslint-disable-next-line no-await-in-loop -- one tooltip at a time
                if (await isOptionalElementPresent(closeButton, timeouts.TWO_SEC)) {
                    try {
                        // eslint-disable-next-line no-await-in-loop -- still animating in when it was found
                        await waitFor(closeButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
                        // eslint-disable-next-line no-await-in-loop
                        await closeButton.tap();
                        // eslint-disable-next-line no-await-in-loop
                        await waitForElementToNotExist(closeButton, timeouts.FIVE_SEC);
                    } catch (error) {
                        throw new Error(`AccountScreen.open: could not dismiss the scheduled-post tooltip: ${(error as Error).message}`);
                    }
                }
            }
        };
        await (isIos() ? withSynchronizationDisabled(dismiss) : dismiss());
    };

    /**
     * Opens the account tab from wherever the app is, first dismissing what can cover it: known modals, a
     * lingering "Logout not complete" dialog, iOS system sheets, the "Removed from team" alert and the
     * scheduled-post tooltip. The optional checks are cheap when nothing is there (isOptionalElementPresent).
     * @returns the account screen element
     */
    open = async () => {
        await dismissKnownModals(2);

        try {
            await waitFor(HomeScreen.channelListTab).toExist().withTimeout(timeouts.FIVE_SEC);
            await HomeScreen.channelListTab.tap();
            await wait(timeouts.ONE_SEC);
        } catch { /* tab bar may already show channels */ }

        // Dismiss any lingering "Logout not complete" dialog left over from a
        // previous test's logout. This can happen on both platforms when the
        // server was unreachable and the handler in logout() didn't dismiss it.
        if (await isOptionalElementPresent(Alert.logoutNotCompleteTitle) && await Alert.dismissLogoutNotCompleteIfPresent()) {
            logInfo('AccountScreen.open dismissed lingering "Logout not complete" dialog');
        }

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

        // Dismiss the "Removed from team" alert if a stale WebSocket team-
        // membership-change event from a previous test file's teardown reaches
        // this session. The dialog can sit on top of the channel list and
        // block every hit-test on the account tab. Confirm its title before
        // dismissing through `Alert.okButton`, whose
        // platform-aware locator handles iOS (`by.label('OK').atIndex(1)`) and
        // Android (`by.text('OK')`) correctly.
        if (await isOptionalElementPresent(Alert.removedFromTeamTitle, timeouts.TWO_SEC)) {
            await Alert.okButton.tap();
            await wait(timeouts.HALF_SEC);
        }

        await this.dismissScheduledPostTooltips();

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

    // Emoji wrapper Views fail Detox visibility on Android and can be briefly missing on iOS,
    // so sync on the plain <Text> and only require the emoji/clear button to exist.
    waitForCustomStatus = async (status: {emoji: string; duration: string; text?: string}) => {
        const customStatusScreen = element(by.id('custom_status.screen'));
        await waitForElementToNotExist(customStatusScreen, timeouts.TEN_SEC);
        await this.toBeVisible();

        const {accountCustomStatusEmoji, accountCustomStatusText} = this.getCustomStatus(status.emoji, status.duration);
        const timeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;

        if (status.text === undefined) {
            await waitFor(accountCustomStatusEmoji).toExist().withTimeout(timeout);
            await waitFor(this.customStatusClearButton).toExist().withTimeout(timeout);
            return;
        }

        // Android: toHaveText requires visibility, but the status text can exist before it passes
        // the visibility threshold — match id and text with toExist instead.
        if (isAndroid()) {
            const statusTextMatcher = by.id(`${this.testID.customStatusPrefix}custom_status_text`).and(by.text(status.text));
            await waitFor(element(statusTextMatcher)).toExist().withTimeout(timeout);
        } else {
            await waitFor(accountCustomStatusText).toHaveText(status.text).withTimeout(timeout);
        }
        await waitFor(accountCustomStatusEmoji).toExist().withTimeout(timeout);
        await waitFor(this.customStatusClearButton).toExist().withTimeout(timeout);
    };

    // Wait for the account row to show its unset state.
    waitForCustomStatusCleared = async (timeout: number = timeouts.TWENTY_SEC) => {
        // Android: toHaveText requires visibility and the row can exist before it passes the
        // visibility threshold -- match id and text with toExist, as waitForCustomStatus does.
        if (isAndroid()) {
            const clearedMatcher = by.id(this.testID.customStatusText).and(by.text('Set a custom status'));
            await waitFor(element(clearedMatcher)).toExist().withTimeout(timeout);
            return;
        }

        await waitFor(this.customStatusText).toHaveText('Set a custom status').withTimeout(timeout);
    };

    // Clear the custom status from the account row and wait for the row to show its unset
    // state.
    clearCustomStatus = async () => {
        // tap() requires 75% visible; Android toBeVisible() defaults to 50%, so gate on the tap's threshold.
        await waitFor(this.customStatusClearButton).toBeVisible(TAP_VISIBLE_PCT).withTimeout(timeouts.TEN_SEC);
        await this.customStatusClearButton.tap();

        try {
            await this.waitForCustomStatusCleared(timeouts.TEN_SEC);
            return;
        } catch {
            // First tap did not take; retry on the control's centre.
        }

        try {
            await this.customStatusClearButton.tap({x: 20, y: 20});
        } catch {
            // The clear button is only rendered while a status is set, so it is gone if the
            // first tap landed just after the wait above expired. Fall through to the wait.
        }
        await this.waitForCustomStatusCleared(timeouts.TWENTY_SEC);
    };

    /**
     * Logs out from the account screen and returns once the app is logged out: on a logged-out screen, or past
     * the "Logout not complete" dialog via "Continue Anyway".
     * @param serverDisplayName - when given, the confirmation alert must name this server
     */
    logout = async (serverDisplayName: string | null = null) => {
        await this.logoutOption.tap();
        if (serverDisplayName) {
            await expect(Alert.logoutTitle(serverDisplayName)).toBeVisible();
        }
        await Alert.logoutButton.tap();

        // When the server-side logout fails (offline, slow network) the app raises "Logout not
        // complete" instead of navigating away (logout() in app/actions/remote/session.ts), so the
        // first of the dialog or a logged-out screen to appear decides. TEN_SEC because CI can be
        // slow to show the dialog. "Continue Anyway" completes the logout instead of leaving the
        // app stuck.
        const outcome = await waitForFirstPresent([
            ['logoutNotComplete', Alert.logoutNotCompleteTitle],
            ['server', ServerScreen.serverScreen],
            ['login', LoginScreen.loginScreen],
            ['serverList', ServerListScreen.serverListScreen],
        ], timeouts.TEN_SEC);
        if (outcome === 'logoutNotComplete' && await Alert.dismissLogoutNotCompleteIfPresent()) {
            logInfo('AccountScreen.logout dismissed "Logout not complete" dialog');
        }

        await waitFor(this.accountScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const accountScreen = new AccountScreen();
export default accountScreen;
