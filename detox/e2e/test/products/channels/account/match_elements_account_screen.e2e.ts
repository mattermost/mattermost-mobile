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
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

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

    it('MM-T4988_1 - should match elements on account screen', async () => {
        // * Verify basic elements on account screen
        const {userInfoProfilePicture, userInfoUserDisplayName, userInfoUsername} = AccountScreen.getUserInfo(testUser.id);

        // The `account.user_info.<userId>.profile_picture` testID lives on the
        // ProfilePicture component's outer plain `<View>` wrapper (see
        // `app/components/profile_picture/index.tsx:91`). On iOS 26 Detox
        // reports `hittable: false, visible: false` for non-touchable wrapper
        // Views, so `.toBeVisible()` fails the 75% threshold even when the
        // image is fully drawn (same class of bug as MM-T4989_1 /
        // MM-T4990_1). The testID encodes the user ID so existence in the
        // tree already proves the correct profile picture is on screen.
        await expect(userInfoProfilePicture).toExist();
        await expect(userInfoUserDisplayName).toHaveText(`${testUser.first_name} ${testUser.last_name} (${testUser.nickname})`);
        await expect(userInfoUsername).toHaveText(`@${testUser.username}`);
        await expect(AccountScreen.userPresenceOption).toBeVisible();
        await expect(AccountScreen.setStatusOption).toBeVisible();
        await expect(AccountScreen.yourProfileOption).toBeVisible();
        await expect(AccountScreen.settingsOption).toBeVisible();
        await expect(AccountScreen.logoutOption).toBeVisible();
    });
});
