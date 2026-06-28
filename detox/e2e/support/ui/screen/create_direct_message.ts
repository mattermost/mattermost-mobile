// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
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
        // On Android, sync was disabled before the navigation tap (in open()), so
        // waitFor().toExist() here is pure polling — no bridge-idle blocking.
        await waitFor(this.createDirectMessageScreen).toExist().withTimeout(timeouts.ONE_MIN);
        if (!isAndroid()) {
            await waitFor(this.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }
        await wait(timeouts.HALF_SEC);

        return this.createDirectMessageScreen;
    };

    open = async () => {
        await waitForElementToExist(ChannelListScreen.headerPlusButton, timeouts.HALF_MIN);
        await ChannelListScreen.headerPlusButton.tap();
        await waitForElementToBeVisible(ChannelListScreen.openDirectMessageItem, timeouts.TEN_SEC);

        if (isAndroid()) {
            await device.disableSynchronization();
        }
        try {
            await ChannelListScreen.openDirectMessageItem.tap();
        } finally {
            if (isAndroid()) {
                // Re-enable sync before waiting for the screen — navigation must settle while
                // the bridge is tracked (machine-9 log: 60s toExist timeout with sync off).
                await safeEnableSynchronization();
            }
        }
        await this.toBeVisible();

        // Wait for any SVG animation overlay to clear before proceeding.
        // The plus-menu icon animation layer (RNSVGGroup) can intercept taps
        // on the search input even after toBeVisible() passes. Dismissing the
        // "Long-press on an item" tutorial overlay here makes the dismissal explicit
        // regardless of the searchInput visibility approach.
        await wait(timeouts.ONE_SEC);
        await this.closeTutorial();

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
                await waitForElementToExist(this.tutorialSwipeLeft, timeouts.TEN_SEC);
                await device.pressBack();

                // Poll until tutorial disappears. waitFor().not.toExist() blocks on bridge-idle
                // after the pressBack() dismiss animation, which can exceed TEN_SEC and cause
                // a spurious timeout that the catch block silently swallows.
                await waitForElementToNotExist(this.tutorialSwipeLeft, timeouts.TEN_SEC);
            }
        } catch {
            // Tutorial may not appear if already dismissed in a previous run
        }
    };
}

const createDirectMessageScreen = new CreateDirectMessageScreen();
export default createDirectMessageScreen;
