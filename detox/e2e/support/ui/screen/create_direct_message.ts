// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {ChannelListScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class CreateDirectMessageScreen {
    testID = {
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
    };

    createDirectMessageScreen = element(by.id(this.testID.createDirectMessageScreen));
    closeButton = element(by.id(this.testID.closeButton));
    startButton = element(by.id(this.testID.startButton));
    searchInput = element(by.id(this.testID.searchInput));
    searchClearButton = element(by.id(this.testID.searchClearButton));
    searchCancelButton = element(by.id(this.testID.searchCancelButton));
    flatUserList = element(by.id(this.testID.flatUserList));
    sectionUserList = element(by.id(this.testID.sectionUserList));
    tutorialHighlight = element(by.id(this.testID.tutorialHighlight));

    getSelectedUser = (userId: string) => {
        return element(by.id(`${this.testID.selectedUserPrefix}${userId}`));
    };

    getSelectedUserDisplayName = (userId: string) => {
        return element(by.id(`${this.testID.selectedUserPrefix}${userId}.display_name`));
    };

    getSelectedUserRemoveButton = (userId: string) => {
        return element(by.id(`${this.testID.selectedUserPrefix}${userId}.remove.button`));
    };

    getUserItem = (userId: string) => {
        return element(by.id(`${this.testID.userItemPrefix}${userId}`));
    };

    getUserItemProfilePicture = (userId: string) => {
        return element(ProfilePicture.getProfilePictureItemMatcher(this.testID.userItemPrefix, userId));
    };

    getUserItemDisplayName = (userId: string) => {
        return element(by.id(`${this.testID.userItemPrefix}${userId}.display_name`));
    };

    toBeVisible = async () => {
        await waitFor(this.createDirectMessageScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.createDirectMessageScreen;
    };

    open = async () => {
        // # Open create direct message screen
        await ChannelListScreen.headerPlusButton.tap();
        await ChannelListScreen.openDirectMessageItem.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.createDirectMessageScreen).not.toBeVisible();
    };

    closeTutorial = async () => {
        await expect(this.tutorialHighlight).toExist();
        await this.closeButton.tap();
        await expect(this.tutorialHighlight).not.toExist();
    };
}

const createDirectMessageScreen = new CreateDirectMessageScreen();
export default createDirectMessageScreen;
