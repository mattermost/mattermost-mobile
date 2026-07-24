// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, safeEnableSynchronization, timeouts, wait, waitForElementToExist, waitForElementToNotExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class CreateDirectMessageScreen {
    testID = {
        selectedDMUserPrefix: 'create_direct_message.',
        selectedUserPrefix: 'create_direct_message.selected_user.',
        userItemPrefix: 'create_direct_message.user_list.user_item.',
        createDirectMessageScreen: 'create_direct_message.screen',
        closeButton: 'close.create_direct_message.button',
        startButton: 'create_direct_message.start.button',
        searchInput: 'create_direct_message.search_bar.search.input',
        searchClearButton: 'create_direct_message.search_bar.search.clear.button',
        searchCancelButton: 'create_direct_message.search_bar.search.cancel.button',
        flatUserList: 'create_direct_message.user_list.flat_list',
        sectionUserList: 'create_direct_message.user_list.section_list',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
        scheduledPostTooltipCloseButton: 'scheduled_post.tooltip.close.button',
    };

    scheduledPostTooltipCloseButton = element(by.id(this.testID.scheduledPostTooltipCloseButton));
    createDirectMessageScreen = element(by.id(this.testID.createDirectMessageScreen));
    closeButton = element(by.id(this.testID.closeButton));
    startButton = element(by.id(this.testID.startButton));
    searchInput = element(by.id(this.testID.searchInput));
    searchClearButton = element(by.id(this.testID.searchClearButton));
    searchCancelButton = element(by.id(this.testID.searchCancelButton));
    flatUserList = element(by.id(this.testID.flatUserList));
    sectionUserList = element(by.id(this.testID.sectionUserList));
    tutorialHighlight = element(by.id(this.testID.tutorialHighlight));
    tutorialSwipeLeft = element(by.id(this.testID.tutorialSwipeLeft));

    getSelectedUser = (userId: string) => {
        return element(by.id(`${this.testID.selectedUserPrefix}${userId}`));
    };

    getSelectedUserDisplayName = (userId: string) => {
        return element(by.id(`${this.testID.selectedUserPrefix}${userId}.display_name`));
    };

    getSelectedDMUserDisplayName = (userId: string) => {
        return element(by.id(`${this.testID.selectedDMUserPrefix}${userId}.display_name`));
    };

    getSelectedUserRemoveButton = (userId: string) => {
        return element(by.id(`${this.testID.selectedUserPrefix}${userId}.remove.button`));
    };

    getUserItem = (userId: string) => {
        return element(by.id(`${this.testID.userItemPrefix}${userId}.${userId}`));
    };

    getUserItemProfilePicture = (userId: string) => {
        return element(ProfilePicture.getProfilePictureItemMatcher(this.testID.userItemPrefix, userId));
    };

    getUserItemDisplayName = (userId: string) => {
        return element(by.id(`${this.testID.userItemPrefix}${userId}.${userId}.display_name`));
    };

    longPressProfileTutorialText = element(by.text("Long-press on an item to view a user's profile"));

    dismissLongPressProfileTutorial = async () => {
        // The long-press profile tutorial is a RN Modal (a separate Dialog window
        // on Android) whose content is pointerEvents='none' — tapping the
        // "Long-press…" text or tutorial_swipe_left does NOT dismiss it (CI
        // 28420130849 MM-T4730_1: text still present after tap at 00:30:47.898).
        // The Modal's onRequestClose fires on hardware Back, which is the only
        // dismissal. Press Back EXACTLY ONCE and only when the tutorial is
        // actually present (detected via the findable "Long-press…" text) — a
        // second pressBack dismisses create_direct_message.screen beneath.
        try {
            await waitFor(this.longPressProfileTutorialText).toBeVisible().withTimeout(timeouts.THREE_SEC);
            await device.pressBack();
            await waitFor(this.longPressProfileTutorialText).not.toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            // Tutorial not shown or already dismissed.
        }
    };

    toBeVisible = async () => {
        // On iOS wait for the screen root and then the search input.
        // A RNSVGGroup (part of the plus-menu icon animation) sits on top of the
        // input immediately after navigation and intercepts taps even though the element
        // is in the hierarchy. Waiting for the input to be visible gives the SVG layer
        // time to finish its animation.
        // On Android edge-to-edge, the tutorial Modal can cover the screen while the root
        // view still exists — dismiss the long-press tooltip before visibility checks.
        if (isAndroid()) {
            await this.dismissLongPressProfileTutorial();
            await waitFor(this.createDirectMessageScreen).toExist().withTimeout(timeouts.ONE_MIN);
        } else {
            await waitFor(this.createDirectMessageScreen).toExist().withTimeout(timeouts.ONE_MIN);
        }
        try {
            await waitFor(this.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        } catch {
            await waitFor(this.searchInput).toExist().withTimeout(timeouts.TEN_SEC);
        }
        await wait(timeouts.HALF_SEC);

        return this.createDirectMessageScreen;
    };

    dismissScheduledPostTooltip = async () => {
        try {
            await waitFor(this.scheduledPostTooltipCloseButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await this.scheduledPostTooltipCloseButton.tap();
        } catch {
            // Tooltip is optional on first open
        }
    };

    open = async () => {
        try {
            await waitFor(this.createDirectMessageScreen).toExist().withTimeout(timeouts.TWO_SEC);
            await this.closeButton.tap();
            await waitForElementToNotExist(this.createDirectMessageScreen, timeouts.TEN_SEC);
        } catch {
            // DM screen is not already open
        }

        await dismissKnownModals(2);
        await ChannelListScreen.openPlusMenu();

        const disableSyncForOpen = isAndroid();
        if (disableSyncForOpen) {
            await device.disableSynchronization();
        }
        try {
            await waitForElementToExist(ChannelListScreen.openDirectMessageItem, timeouts.TEN_SEC);

            /* eslint-disable no-await-in-loop -- retry menu item tap while plus-menu animation settles */
            for (let i = 0; i < 3; i++) {
                try {
                    await ChannelListScreen.openDirectMessageItem.tap();
                    break;
                } catch (err) {
                    if (i === 2) {
                        throw err;
                    }
                    await wait(timeouts.ONE_SEC);
                }
            }
            /* eslint-enable no-await-in-loop */
        } finally {
            if (disableSyncForOpen) {
                // Re-enable sync before waiting for the screen — navigation must settle while
                // the bridge is tracked (machine-9 log: 60s toExist timeout with sync off).
                await safeEnableSynchronization();
            }
        }

        if (isAndroid()) {
            // CI 28416284905 MM-T4730_1 testFnFailure.png: navigation succeeds but a
            // long-press tutorial Modal holds the Dialog window focus, so Espresso
            // cannot see create_direct_message.screen in the Activity for 60s. Dismiss
            // the tutorial first, then probe the activity window.
            await wait(timeouts.ONE_SEC);
            await this.dismissLongPressProfileTutorial();
            await waitFor(this.createDirectMessageScreen).toExist().withTimeout(timeouts.TWENTY_SEC);
            await this.dismissScheduledPostTooltip();
        }

        await this.toBeVisible();

        // Wait for any SVG animation overlay to clear before proceeding.
        await wait(timeouts.ONE_SEC);
        await this.closeTutorial();
        await this.dismissScheduledPostTooltip();

        return this.createDirectMessageScreen;
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.createDirectMessageScreen).not.toBeVisible();
    };

    closeTutorial = async () => {
        try {
            if (isIos()) {
                await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.TEN_SEC);
                await this.tutorialSwipeLeft.tap();
                await waitFor(this.tutorialHighlight).not.toExist().withTimeout(timeouts.TEN_SEC);
            } else {
                // Android: the TutorialHighlight is a RN Modal (separate Dialog
                // window). Its content is pointerEvents='none' (tapping does
                // nothing) and tutorial_swipe_left is never found via Espresso.
                // dismissLongPressProfileTutorial() handles the single pressBack
                // dismissal guarded by the tutorial's presence -- do NOT blind
                // pressBack here (CI 28420130849: 3x blind pressBack dismissed
                // create_direct_message.screen after the 1st dismissed the Dialog).
                await this.dismissLongPressProfileTutorial();
            }
        } catch {
            // Tutorial may not appear if already dismissed in a previous run
        }
    };
}

const createDirectMessageScreen = new CreateDirectMessageScreen();
export default createDirectMessageScreen;
