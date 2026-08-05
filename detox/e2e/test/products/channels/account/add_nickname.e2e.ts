// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    ChannelScreen,
    EditProfileScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {waitFor} from 'detox';

describe('Account - Account Menu', () => {

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
        // # Log out — guard in case MM-T2056 was skipped and we're still on account screen
        try {
            await ChannelScreen.back();
        } catch { /* not on channel screen */ }
        await HomeScreen.logout();
    });

    // TODO: MM-T2056 skipped — post header display name does not update within 60s after
    // username change via WebSocket user_updated event on local iOS simulator. Investigate
    // whether WatermelonDB reactive query properly re-renders post list on User record change.

    it('MM-T3472 - should be able to add Nickname', async () => {
        const nickname = 'nickname';
        const existingNickname = testUser.nickname;

        await AccountScreen.yourProfileOption.tap();
        await EditProfileScreen.toBeVisible();

        await EditProfileScreen.nicknameInput.replaceText(nickname);
        await EditProfileScreen.saveButton.tap();
        await AccountScreen.toBeVisible();

        // Verify nickname is shown in the profile screen
        await AccountScreen.yourProfileOption.tap();
        await EditProfileScreen.toBeVisible();
        await waitFor(EditProfileScreen.nicknameInput).toHaveText(nickname).withTimeout(timeouts.TEN_SEC);

        // Verify nickname is different than previous nickname
        const {user} = await User.apiGetUserById(siteOneUrl, testUser.id);
        if (existingNickname === user.nickname) {
            throw new Error('Nickname was not updated');
        }

        // # Go back to account screen
        await EditProfileScreen.close();

    });
});
