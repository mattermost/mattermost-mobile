// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {AccountScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class EditProfileScreen {
    testID = {
        editProfileScreenPrefix: 'edit_profile.',
        editProfileScreen: 'edit_profile.screen',
        closeButton: 'close.edit_profile.button',
        saveButton: 'edit_profile.save.button',
        scrollView: 'edit_profile.scroll_view',
        firstNameInput: 'edit_profile_form.firstName.input',
        firstNameInputDisabled: 'edit_profile_form.firstName.input.disabled',
        lastNameInput: 'edit_profile_form.lastName.input',
        lastNameInputDisabled: 'edit_profile_form.lastName.input.disabled',
        usernameInput: 'edit_profile_form.username.input',
        usernameInputDisabled: 'edit_profile_form.username.input.disabled',
        emailInput: 'edit_profile_form.email.input',
        emailInputDisabled: 'edit_profile_form.email.input.disabled',
        emailInputDescription: 'edit_profile_form.email.input.description',
        nicknameInput: 'edit_profile_form.nickname.input',
        nicknameInputDisabled: 'edit_profile_form.nickname.input.disabled',
        positionInput: 'edit_profile_form.position.input',
        positionInputDisabled: 'edit_profile_form.position.input.disabled',
    };

    editProfileScreen = element(by.id(this.testID.editProfileScreen));
    closeButton = element(by.id(this.testID.closeButton));
    saveButton = element(by.id(this.testID.saveButton));
    scrollView = element(by.id(this.testID.scrollView));
    firstNameInput = element(by.id(this.testID.firstNameInput));
    firstNameInputDisabled = element(by.id(this.testID.firstNameInputDisabled));
    lastNameInput = element(by.id(this.testID.lastNameInput));
    lastNameInputDisabled = element(by.id(this.testID.lastNameInputDisabled));
    usernameInput = element(by.id(this.testID.usernameInput));
    usernameInputDisabled = element(by.id(this.testID.usernameInputDisabled));
    emailInput = element(by.id(this.testID.emailInput));
    emailInputDisabled = element(by.id(this.testID.emailInputDisabled));
    emailInputDescription = element(by.id(this.testID.emailInputDescription));
    nicknameInput = element(by.id(this.testID.nicknameInput));
    nicknameInputDisabled = element(by.id(this.testID.nicknameInputDisabled));
    positionInput = element(by.id(this.testID.positionInput));
    positionInputDisabled = element(by.id(this.testID.positionInputDisabled));

    getEditProfilePicture = (userId: string) => {
        return element(ProfilePicture.getProfilePictureItemMatcher(this.testID.editProfileScreenPrefix, userId));
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
