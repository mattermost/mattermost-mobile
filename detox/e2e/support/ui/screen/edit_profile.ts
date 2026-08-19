// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {AccountScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';

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
        usernameInputError: 'edit_profile_form.username.input.error',
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
    usernameInputError = element(by.id(this.testID.usernameInputError));
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

    // Tap target for opening the image-picker bottom sheet. The visible
    // profile-picture wrapper (`edit_profile.<userId>.profile_picture`) is
    // a plain `<View>` and Detox iOS 26 reports it as `hittable: false`, so
    // `.tap()` on it fails the visibility-around-point check. The actual
    // touchable is a `<TouchableOpacity>` inside (the camera-icon badge),
    // tagged with `.picker` — see
    // `app/screens/edit_profile/components/profile_image_picker.tsx`.
    getEditProfilePicturePicker = (userId: string) => {
        return element(by.id(`${this.testID.editProfileScreenPrefix}${userId}.profile_picture.picker`));
    };

    toBeVisible = async () => {
        await waitFor(this.editProfileScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // Wait for `firstNameInput` to pass iOS' 75% / Android's 50% visibility
        // threshold instead of using an arbitrary sleep. The first name input
        // sits inside the modal's scrollable content area: once Detox confirms
        // it is visible, the modal slide-in animation is finished and its
        // bounds have settled — which is the actual condition the failing
        // tests need. Earlier MM-T288_1 / MM-T289_1 / MM-T290_1 / MM-T4989_1
        // failures stemmed from asserting the profile picture's visibility
        // while the modal was still mid-transform (bounds overlapping the
        // status bar / dynamic island, dropping visibility below threshold).
        // Polling `firstNameInput` removes the guessed sleep duration and
        // fails fast if the modal genuinely fails to open.
        await waitFor(this.firstNameInput).toBeVisible().withTimeout(timeouts.FIVE_SEC);

        return this.editProfileScreen;
    };

    open = async () => {
        // # Open edit profile screen
        await AccountScreen.yourProfileOption.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();

        // `edit_profile.screen` is on a SafeAreaView wrapper. When the modal
        // pops, the SafeAreaView unmounts and the testID leaves the
        // hierarchy. `waitFor(...).not.toExist().withTimeout()` is both more
        // strict (the view must actually be gone, not just hidden) and more
        // robust against iOS-26 Detox's inconsistent visibility computation
        // on non-touchable wrappers — observed locally in MM-T290_1 where
        // the same wrapper reported `visible: true` immediately after the
        // close tap, failing the previous synchronous
        // `expect(...).not.toBeVisible()` assertion while the modal was
        // still mid-dismiss animation.
        await waitFor(this.editProfileScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
    };
}

const editProfileScreen = new EditProfileScreen();
export default editProfileScreen;
