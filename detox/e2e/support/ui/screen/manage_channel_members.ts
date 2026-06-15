// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, ProfilePicture} from '@support/ui/component';
import {ChannelInfoScreen} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class ManageChannelMembersScreen {
    testID = {
        backButton: 'screen.back.button',
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
        if (isIos()) {
            await waitFor(this.manageMembersScreen).toExist().withTimeout(timeouts.TEN_SEC);
        }

        return this.manageMembersScreen;
    };

    open = async () => {
        // # Open channel info screen and tap on members option
        await ChannelInfoScreen.membersOption.tap();
        await wait(timeouts.ONE_SEC);
        return this.toBeVisible();
    };

    close = async () => {
        await this.backButton.tap();
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

    closeTutorial = async () => {
        try {
            if (isIos()) {
                await waitFor(this.tutorialHighlight).toExist().withTimeout(timeouts.HALF_MIN);
                await this.tutorialSwipeLeft.tap();
                await expect(this.tutorialHighlight).not.toExist();
            } else {
                await wait(timeouts.ONE_SEC);
                await device.pressBack();
                await wait(timeouts.ONE_SEC);
            }
        } catch {
            // eslint-disable-next-line no-console
            console.log('Tutorial element not visible, skipping action:');
        }
    };

    searchAndRemoveUser = async (username: string, userId: string) => {
        await expect(this.searchInput).toBeVisible();
        await this.searchInput.typeText(`${username}`);
        await wait(timeouts.TWO_SEC);

        const userItem = this.getUserItem(userId);
        await waitFor(userItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.TWO_SEC);

        await expect(this.removeButton).toBeVisible();
        await this.removeButton.tap();
        await wait(timeouts.TWO_SEC);

        await Alert.removeButton.tap();
        await wait(timeouts.TWO_SEC);

        await device.pressBack();
    };
}

const manageChannelMembersScreen = new ManageChannelMembersScreen();
export default manageChannelMembersScreen;

