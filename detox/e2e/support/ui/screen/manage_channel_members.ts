// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, ProfilePicture} from '@support/ui/component';
import {ChannelInfoScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class ManageChannelMembersScreen {
    testID = {
        backButton: 'navigation.header.back',
        manageMembersScreen: 'manage_members.screen',
        channelMembersScreen: 'channel_members.screen',
        manageDoneButton: 'manage_members.button', // Same button, text changes between "Manage" and "Done"
        searchBar: 'manage_members.search_bar',
        searchInput: 'manage_members.search_bar.search.input',
        userList: 'manage_members.user_list',
        userItemPrefix: 'manage_members.user_list.user_item.',
        removeButton: 'channel.remove_member',
        notice: 'manage_members.notice',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
        gmMemberSectionList: 'manage_members.user_list.section_list',
    };

    gmMemberSectionList = element(by.id(this.testID.gmMemberSectionList));
    manageMembersScreen = element(by.id(this.testID.manageMembersScreen));
    channelMembersScreen = element(by.id(this.testID.channelMembersScreen));
    manageButton = element(by.id(this.testID.manageDoneButton));
    doneButton = element(by.id(this.testID.manageDoneButton)); // Same element as manageButton, different text
    searchBar = element(by.id(this.testID.searchBar));
    searchInput = element(by.id(this.testID.searchInput));
    userList = element(by.id(this.testID.userList));
    removeButton = element(by.id(this.testID.removeButton));
    notice = element(by.id(this.testID.notice));
    tutorialHighlight = element(by.id(this.testID.tutorialHighlight));
    tutorialSwipeLeft = element(by.id(this.testID.tutorialSwipeLeft));
    backButton = element(by.id(this.testID.backButton));

    // Same {id}.{userId} nesting as CreateDirectMessageScreen — prefer display_name (SEC-11049).
    getUserItem = (userId: string) => {
        return element(by.id(`${this.testID.userItemPrefix}${userId}.${userId}`));
    };

    getUserItemProfilePicture = (userId: string) => {
        return element(ProfilePicture.getProfilePictureItemMatcher(this.testID.userItemPrefix, `${userId}.${userId}`));
    };

    getUserItemDisplayName = (userId: string) => {
        return element(by.id(`${this.testID.userItemPrefix}${userId}.${userId}.display_name`));
    };

    selectUser = async (userId: string) => {
        const displayName = this.getUserItemDisplayName(userId);
        await waitFor(displayName).toBeVisible(isAndroid() ? 40 : 75).withTimeout(timeouts.HALF_MIN);
        await displayName.tap({x: 1, y: 1});
    };

    toBeVisible = async () => {
        const timeout = isAndroid() ? timeouts.HALF_MIN : timeouts.TEN_SEC;
        await waitForElementToExist(this.manageMembersScreen, timeout);

        return this.manageMembersScreen;
    };

    open = async () => {
        try {
            await ChannelInfoScreen.scrollView.scroll(200, 'down');
        } catch {
            // scrollView may not need scrolling
        }
        await waitFor(ChannelInfoScreen.membersOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelInfoScreen.membersOption.tap();

        // SEC-11049: on Android the first-run onboarding tutorial (a React Native Modal)
        // opens over ManageChannelMembersScreen and steals Espresso's window focus, so
        // `manage_members.screen` is not matchable until the tutorial is dismissed.
        if (isAndroid()) {
            await this.closeTutorial();
        }

        return this.toBeVisible();
    };

    close = async () => {
        if (isIos()) {
            await this.manageMembersScreen.swipe('right', 'slow', 0.75, 0.01, 0.5);
        } else {
            await device.pressBack();
        }
        await expect(this.manageMembersScreen).not.toBeVisible();
    };

    toggleManageMode = async () => {
        // # Tap on manage/done button to toggle manage mode
        // The button testID is the same for both states, so we use manageButton
        await this.manageButton.tap();
        await wait(timeouts.ONE_SEC);
    };

    exitManageMode = async () => {
        // # Tap on done button to exit manage mode
        // The button testID is the same for both states, so we use doneButton (which is the same element)
        await this.doneButton.tap();
        await wait(timeouts.ONE_SEC);
    };

    longPressProfileTutorialText = element(by.text("Long-press on an item to view a user's profile"));

    dismissLongPressProfileTutorial = async () => {
        try {
            await waitFor(this.longPressProfileTutorialText).toBeVisible().withTimeout(timeouts.THREE_SEC);
            await device.pressBack();
            await waitFor(this.longPressProfileTutorialText).not.toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            // Tutorial not shown or already dismissed.
        }
    };

    closeTutorial = async () => {
        try {
            if (isIos()) {
                await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.HALF_MIN);
                await this.tutorialSwipeLeft.tap();
                await waitFor(this.tutorialHighlight).not.toExist().withTimeout(timeouts.TEN_SEC);
            } else {
                await this.dismissLongPressProfileTutorial();
            }
        } catch {
            // Tutorial may not appear if already dismissed in a previous run
        }
    };

    searchAndRemoveUser = async (username: string, userId: string) => {
        await expect(this.searchInput).toBeVisible();
        await this.searchInput.typeText(`${username}`);
        await wait(timeouts.TWO_SEC);

        const userDisplayName = this.getUserItemDisplayName(userId);
        await waitForElementToExist(userDisplayName, timeouts.TEN_SEC);
        if (isIos()) {
            try {
                await this.searchInput.tapReturnKey();
            } catch { /* keyboard may already be dismissed */ }
            await wait(timeouts.HALF_SEC);
        }

        // Corner-tap: the member row's center is obscured by the manage-members
        // modal's UITransitionView (same workaround as PostOptionsScreen.deletePost).
        await userDisplayName.tap({x: 1, y: 1});
        await wait(timeouts.TWO_SEC);

        await waitFor(this.removeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // Corner-tap: the modal's UITransitionView also intercepts this button's centre tap.
        await this.removeButton.tap({x: 1, y: 1});

        await waitFor(Alert.removeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await Alert.removeButton.tap();
        await wait(timeouts.TWO_SEC);

        // Dismiss the remove-member alert overlay on Android. On iOS pressBack() is not
        // supported — callers use close() to pop ManageChannelMembersScreen instead.
        if (isAndroid()) {
            await device.pressBack();
        }
    };
}

const manageChannelMembersScreen = new ManageChannelMembersScreen();
export default manageChannelMembersScreen;

