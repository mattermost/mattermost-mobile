// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {AccountScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class EditProfileScreen {
    testID = {
        editProfileScreen: 'edit_profile.screen',
        editProfilePrefix: 'edit_profile.',
        closeButton: 'close.edit_profile.button',
        saveButton: 'edit_profile.save.button',
        scrollView: 'edit_profile.scroll_view',
        systemAdminTag: 'edit_profile.system_admin.tag',
        teamAdminTag: 'edit_profile.team_admin.tag',
        channelAdminTag: 'edit_profile.channel_admin.tag',
        userDisplayName: 'edit_profile.display_name',
        username: 'edit_profile.username',
        sendMessageProfileOption: 'edit_profile_options.send_message.option',
        mentionProfileOption: 'edit_profile_options.mention.option',
        userNicknameTitle: 'edit_profile.nickname.title',
        userNicknameDescription: 'edit_profile.nickname.description',
        userPositionTitle: 'edit_profile.position.title',
        userPositionDescription: 'edit_profile.position.description',
        userLocalTimeTitle: 'edit_profile.local_time.title',
        userLocalTimeDescription: 'edit_profile.local_time.description',
    };

    editProfileScreen = element(by.id(this.testID.editProfileScreen));
    closeButton = element(by.id(this.testID.closeButton));
    saveButton = element(by.id(this.testID.saveButton));
    scrollView = element(by.id(this.testID.scrollView));
    userDisplayName = element(by.id(this.testID.userDisplayName));
    username = element(by.id(this.testID.username));
    sendMessageProfileOption = element(by.id(this.testID.sendMessageProfileOption));
    mentionProfileOption = element(by.id(this.testID.mentionProfileOption));
    userNicknameTitle = element(by.id(this.testID.userNicknameTitle));
    userNicknameDescription = element(by.id(this.testID.userNicknameDescription));
    userPositionTitle = element(by.id(this.testID.userPositionTitle));
    userPositionDescription = element(by.id(this.testID.userPositionDescription));
    userLocalTimeTitle = element(by.id(this.testID.userLocalTimeTitle));
    userLocalTimeDescription = element(by.id(this.testID.userLocalTimeDescription));

    getEditProfilePicture = (userId: string) => {
        return element(ProfilePicture.getProfilePictureItemMatcher(this.testID.editProfilePrefix, userId));
    };

    toBeVisible = async () => {
        await waitFor(this.editProfileScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.editProfileScreen;
    };

    open = async () => {
        // # Open edit profile screen
        await AccountScreen.yourProfileOption.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.editProfileScreen).not.toBeVisible();
    };
}

const editProfileScreen = new EditProfileScreen();
export default editProfileScreen;
