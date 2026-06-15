// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    EditProfileScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, isIos} from '@support/utils';
import {expect} from 'detox';

describe('Account - Edit Profile', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server and go to account screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
    });

    beforeEach(async () => {
        // * Verify on account screen
        await AccountScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4989_1 - should match elements on edit profile screen', async () => {
        // # Open edit profile screen
        await EditProfileScreen.open();

        // * Verify basic elements on edit profile screen
        await expect(EditProfileScreen.closeButton).toBeVisible();
        await expect(EditProfileScreen.saveButton).toBeVisible();
        await expect(EditProfileScreen.getEditProfilePicture(testUser.id)).toBeVisible();
        await waitFor(EditProfileScreen.firstNameInput).toExist().withTimeout(2000);
        if (isIos()) {
            await expect(EditProfileScreen.firstNameInput).toHaveValue(testUser.first_name);
            await expect(EditProfileScreen.lastNameInput).toHaveValue(testUser.last_name);
            await expect(EditProfileScreen.usernameInput).toHaveValue(testUser.username);
            await expect(EditProfileScreen.emailInputDisabled).toHaveValue(testUser.email);
            await expect(EditProfileScreen.nicknameInput).toHaveValue(testUser.nickname);
            await expect(EditProfileScreen.positionInput).toHaveValue(testUser.position);
        } else {
            await expect(EditProfileScreen.firstNameInput).toHaveText(testUser.first_name);
            await expect(EditProfileScreen.lastNameInput).toHaveText(testUser.last_name);
            await expect(EditProfileScreen.usernameInput).toHaveText(testUser.username);
            await expect(EditProfileScreen.emailInputDisabled).toHaveText(testUser.email);
            await expect(EditProfileScreen.nicknameInput).toHaveText(testUser.nickname);
            await expect(EditProfileScreen.positionInput).toHaveText(testUser.position);
        }
        await expect(EditProfileScreen.emailInputDescription).toHaveText('Email must be updated using a web client or desktop application.');

        // # Go back to account screen
        await EditProfileScreen.close();
    });

    it('MM-T4989_2 - should be able to edit profile and save', async () => {
        // # Open edit profile screen, edit fields, and tap on save button
        const suffix = getRandomId(3);
        await EditProfileScreen.open();
        await EditProfileScreen.firstNameInput.replaceText(`${testUser.first_name}${suffix}`);
        await EditProfileScreen.lastNameInput.replaceText(`${testUser.last_name}${suffix}`);
        await EditProfileScreen.scrollView.tap({x: 1, y: 1});
        await waitFor(EditProfileScreen.usernameInput).toBeVisible().whileElement(by.id(EditProfileScreen.testID.scrollView)).scroll(50, 'down');
        await EditProfileScreen.usernameInput.clearText();
        await EditProfileScreen.usernameInput.typeText(`${testUser.username}${suffix}`);
        await EditProfileScreen.scrollView.tap({x: 1, y: 1});
        await waitFor(EditProfileScreen.nicknameInput).toBeVisible().whileElement(by.id(EditProfileScreen.testID.scrollView)).scroll(50, 'down');
        await EditProfileScreen.nicknameInput.replaceText(`${testUser.nickname}${suffix}`);
        await EditProfileScreen.scrollView.tap({x: 1, y: 1});
        await waitFor(EditProfileScreen.positionInput).toBeVisible().whileElement(by.id(EditProfileScreen.testID.scrollView)).scroll(50, 'down');
        await EditProfileScreen.positionInput.replaceText(`${testUser.position}${suffix}`);
        await EditProfileScreen.saveButton.tap();

        // * Verify on account screen and user full name and username are updated
        await AccountScreen.toBeVisible();
        const {userInfoUserDisplayName, userInfoUsername} = AccountScreen.getUserInfo(testUser.id);
        await expect(userInfoUserDisplayName).toHaveText(`${testUser.first_name}${suffix} ${testUser.last_name}${suffix} (${testUser.nickname}${suffix})`);
        await expect(userInfoUsername).toHaveText(`@${testUser.username}${suffix}`);

        // # Open edit profile screen
        await EditProfileScreen.open();

        // * Verify edited profile fields contain the updated values
        if (isIos()) {
            await expect(EditProfileScreen.firstNameInput).toHaveValue(`${testUser.first_name}${suffix}`);
            await expect(EditProfileScreen.lastNameInput).toHaveValue(`${testUser.last_name}${suffix}`);
            await expect(EditProfileScreen.usernameInput).toHaveValue(`${testUser.username}${suffix}`);
            await expect(EditProfileScreen.emailInputDisabled).toHaveValue(testUser.email);
            await expect(EditProfileScreen.nicknameInput).toHaveValue(`${testUser.nickname}${suffix}`);
            await expect(EditProfileScreen.positionInput).toHaveValue(`${testUser.position}${suffix}`);
        } else {
            await expect(EditProfileScreen.firstNameInput).toHaveText(`${testUser.first_name}${suffix}`);
            await expect(EditProfileScreen.lastNameInput).toHaveText(`${testUser.last_name}${suffix}`);
            await expect(EditProfileScreen.usernameInput).toHaveText(`${testUser.username}${suffix}`);
            await expect(EditProfileScreen.emailInputDisabled).toHaveText(testUser.email);
            await expect(EditProfileScreen.nicknameInput).toHaveText(`${testUser.nickname}${suffix}`);
            await expect(EditProfileScreen.positionInput).toHaveText(`${testUser.position}${suffix}`);
        }

        // # Go back to account screen
        await EditProfileScreen.close();
    });
});
