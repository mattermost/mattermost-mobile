// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {ChannelListScreen} from '@support/ui/screen';
import {isAndroid, isIos, safeEnableSynchronization, timeouts, wait, waitForElementToBeVisible, waitForElementToExist, waitForElementToNotExist} from '@support/utils';
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

    toBeVisible = async () => {
        // On iOS wait for the screen root and then the search input.
        // A RNSVGGroup (part of the plus-menu icon animation) sits on top of the
        // input immediately after navigation and intercepts taps even though the element
        // is in the hierarchy. Waiting for the input to be visible gives the SVG layer
        // time to finish its animation.
        // On Android edge-to-edge, the tutorial Modal can cover the screen while the root
        // view still exists — use visibility polling after closeTutorial() in open().
        if (isAndroid()) {
            await waitForElementToBeVisible(this.createDirectMessageScreen, timeouts.ONE_MIN);
        } else {
            await waitFor(this.createDirectMessageScreen).toExist().withTimeout(timeouts.ONE_MIN);
        }
        await waitFor(this.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
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
        await waitForElementToExist(ChannelListScreen.headerPlusButton, timeouts.HALF_MIN);

        const disableSyncForOpen = isAndroid();
        if (disableSyncForOpen) {
            await device.disableSynchronization();
        }
        try {
            let plusTapError: unknown;
            /* eslint-disable no-await-in-loop -- retry plus-button tap while transition overlay clears */
            for (let i = 0; i < 3; i++) {
                try {
                    await ChannelListScreen.headerPlusButton.tap();
                    plusTapError = undefined;
                    break;
                } catch (err) {
                    plusTapError = err;
                    await wait(timeouts.ONE_SEC);
                }
            }
            /* eslint-enable no-await-in-loop */
            if (plusTapError) {
                throw plusTapError;
            }

            await wait(timeouts.ONE_SEC);
            await waitForElementToBeVisible(ChannelListScreen.openDirectMessageItem, timeouts.TEN_SEC);

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
            // Tutorial Modal is a separate Dialog window — dismiss it before visibility checks.
            await waitForElementToExist(this.createDirectMessageScreen, timeouts.ONE_MIN);
            await wait(timeouts.ONE_SEC);
            await this.closeTutorial();
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
                // On Android the TutorialHighlight uses a React Native Modal, which creates a
                // separate Dialog window. Espresso's onView() searches the currently focused window
                // — the Dialog — not the Activity. The 'tutorial_highlight' testID is on the Modal
                // itself (not a View), so it is never found. The 'tutorial_swipe_left' View sits
                // inside the Modal and IS accessible from the Dialog window.
                /* eslint-disable no-await-in-loop -- bounded tutorial dismiss retries */
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        await waitForElementToExist(this.tutorialSwipeLeft, timeouts.THREE_SEC);
                        await this.tutorialSwipeLeft.tap();
                        await device.pressBack();
                        await waitForElementToNotExist(this.tutorialSwipeLeft, timeouts.FIVE_SEC);
                        return;
                    } catch {
                        await device.pressBack();
                    }
                }
                /* eslint-enable no-await-in-loop */
            }
        } catch {
            // Tutorial may not appear if already dismissed in a previous run
        }
    };
}

const createDirectMessageScreen = new CreateDirectMessageScreen();
export default createDirectMessageScreen;
