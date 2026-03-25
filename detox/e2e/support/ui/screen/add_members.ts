// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class AddMembersScreen {
    testID = {
        addMembersScreen: 'add_members.screen',
        searchInput: 'add_members.search_bar.search.input',
        userList: 'add_members.user_list',
        userItemPrefix: 'add_members.user_list.user_item.',
        addButton: 'add_members.add.button',
        addChannelMembersButton: 'add_members.selected.start.button',
        backButton: 'screen.back.button',
        tutorialTooltip: 'tutorial_highlight',
    };

    addChannelMembersButton = element(by.id(this.testID.addChannelMembersButton));
    addMembersScreen = element(by.id(this.testID.addMembersScreen));
    searchInput = element(by.id(this.testID.searchInput));
    userList = element(by.id(this.testID.userList));
    addButton = element(by.id(this.testID.addButton));
    backButton = element(by.id(this.testID.backButton));
    tutorialTooltip = element(by.id(this.testID.tutorialTooltip));

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
        await waitFor(this.searchInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        return this.addMembersScreen;
    };

    close = async () => {
        await this.backButton.tap();
        await expect(this.addMembersScreen).not.toBeVisible();
    };

    dismissTutorial = async () => {
        try {
            const tutorialText = element(by.text('Long-press on an item to view a user\'s profile'));
            await waitFor(tutorialText).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await tutorialText.tap();
            await wait(timeouts.HALF_SEC);
        } catch {
            // Tutorial not visible, continue
        }
    };

    searchAndAddUser = async (username: string, userId: string) => {
        await this.searchInput.typeText(`${username}\n`);
        await wait(timeouts.TWO_SEC);

        const userItem = this.getUserItem(userId);
        await waitFor(userItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.ONE_SEC);

        await waitFor(this.addChannelMembersButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.addChannelMembersButton.tap();
        await wait(timeouts.TWO_SEC);
    };
}

const addMembersScreen = new AddMembersScreen();
export default addMembersScreen;
