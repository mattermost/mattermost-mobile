// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {UserProfileScreen} from '@support/ui/screen';

class EditProfileScreen {
    testID = {
        editProfilePicturePrefix: 'edit_profile.profile_picture.',
        editProfileScreen: 'edit_profile.screen',
        editProfileScrollView: 'edit_profile.scroll_view',
        backButton: 'screen.back.button',
        saveButton: 'edit_profile.save.button',
        editProfileError: 'edit_profile.error.text',
        emailInput: 'edit_profile.text_setting.email.input',
        emailLabel: 'edit_profile.text_setting.email.label',
        firstNameInput: 'edit_profile.text_setting.first_name.input',
        firstNameLabel: 'edit_profile.text_setting.first_name.label',
        lastNameInput: 'edit_profile.text_setting.last_name.input',
        lastNameLabel: 'edit_profile.text_setting.last_name.label',
        nicknameInput: 'edit_profile.text_setting.nickname.input',
        nicknameLabel: 'edit_profile.text_setting.nickname.label',
        positionInput: 'edit_profile.text_setting.position.input',
        positionLabel: 'edit_profile.text_setting.position.label',
        usernameInput: 'edit_profile.text_setting.username.input',
        usernameLabel: 'edit_profile.text_setting.username.label',
    };

    editProfileScreen = element(by.id(this.testID.editProfileScreen));
    editProfileScrollView = element(by.id(this.testID.editProfileScrollView));
    backButton = element(by.id(this.testID.backButton));
    saveButton = element(by.id(this.testID.saveButton));
    editProfileError = element(by.id(this.testID.editProfileError));
    emailInput = element(by.id(this.testID.emailInput));
    emailLabel = element(by.id(this.testID.emailLabel));
    firstNameInput = element(by.id(this.testID.firstNameInput));
    firstNameLabel = element(by.id(this.testID.firstNameLabel));
    lastNameInput = element(by.id(this.testID.lastNameInput));
    lastNameLabel = element(by.id(this.testID.lastNameLabel));
    nicknameInput = element(by.id(this.testID.nicknameInput));
    nicknameLabel = element(by.id(this.testID.nicknameLabel));
    positionInput = element(by.id(this.testID.positionInput));
    positionLabel = element(by.id(this.testID.positionLabel));
    usernameInput = element(by.id(this.testID.usernameInput));
    usernameLabel = element(by.id(this.testID.usernameLabel));

    getProfilePicture = (userId) => {
        const profilePictureItemMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.editProfilePicturePrefix, userId);
        return element(profilePictureItemMatcher);
    };

    toBeVisible = async () => {
        await expect(this.editProfileScreen).toBeVisible();

        return this.editProfileScreen;
    };

    open = async () => {
        // # Open edit profile screen
        await UserProfileScreen.editButton.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.editProfileScreen).not.toBeVisible();
    };
}

const editProfileScreen = new EditProfileScreen();
export default editProfileScreen;
