// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class AddMembersScreen {
    testID = {
        addMembersScreen: 'add_members.screen',
        searchInput: 'add_members.search_bar.search.input',
        userList: 'add_members.user_list',
        flatUserList: 'add_members.user_list.flat_list',
        userItemPrefix: 'add_members.user_list.user_item.',
        addButton: 'add_members.add.button',
        addChannelMembersButton: 'add_members.selected.start.button',
        backButton: 'navigation.header.back',
        tutorialTooltip: 'tutorial_highlight',
    };

    addChannelMembersButton = element(by.id(this.testID.addChannelMembersButton));
    addMembersScreen = element(by.id(this.testID.addMembersScreen));
    searchInput = element(by.id(this.testID.searchInput));
    userList = element(by.id(this.testID.userList));
    flatUserList = element(by.id(this.testID.flatUserList));
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
        await waitFor(this.addMembersScreen).toExist().withTimeout(timeouts.TEN_SEC);
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
        await this.searchInput.replaceText(username);
        await this.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        const userDisplayName = this.getUserItemDisplayName(userId);
        await waitForElementToExist(userDisplayName, timeouts.TEN_SEC);

        if (isIos()) {
            try {
                await this.searchInput.tapReturnKey();
            } catch { /* keyboard may already be dismissed */ }
            await wait(timeouts.HALF_SEC);
        }

        const tapUserRow = async () => {
            if (isIos()) {
                await device.disableSynchronization();
            }
            try {
                // display_name is less likely to be clipped than the full row container
                await userDisplayName.tap();
            } catch {
                try {
                    await this.flatUserList.scroll(80, 'down');
                    await wait(timeouts.HALF_SEC);
                } catch { /* list may be too short to scroll */ }
                await this.getUserItem(userId).tap({x: 10, y: 20});
            } finally {
                if (isIos()) {
                    await device.enableSynchronization();
                }
            }
        };
        await tapUserRow();
        await wait(timeouts.ONE_SEC);

        // Keyboard can re-open after selection; dismiss again before tapping Add Members.
        try {
            await this.searchInput.tapReturnKey();
        } catch { /* keyboard may already be dismissed */ }
        await wait(timeouts.HALF_SEC);

        await waitForElementToBeVisible(this.addChannelMembersButton, timeouts.HALF_MIN);
        await this.addChannelMembersButton.tap();
        await wait(timeouts.TWO_SEC);
    };
}

const addMembersScreen = new AddMembersScreen();
export default addMembersScreen;
