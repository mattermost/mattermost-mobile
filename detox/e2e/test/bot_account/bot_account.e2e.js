// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Bot,
    Setup,
    Team,
} from '@support/server_api';
import {
    ChannelScreen,
    MoreDirectMessagesScreen,
    UserProfileScreen,
} from '@support/ui/screen';

describe('Bot Account', () => {
    const {
        getChannelIntroProfilePicture,
        openMainSidebar,
    } = ChannelScreen;
    let testBot;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit();

        ({bot: testBot} = await Bot.apiCreateBot());
        await Team.apiAddUserToTeam(testBot.user_id, team.id);

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T1824 should be able to show bot profile', async () => {
        const {
            getUserAtIndex,
            searchInput,
            startButton,
        } = MoreDirectMessagesScreen;
        const {
            additionalOptionsAction,
            getProfilePicture,
            localTimeLabel,
            sendMessageAction,
            userProfileBotTag,
        } = UserProfileScreen;

        // # Create a DM with the other user
        await openMainSidebar();
        await MoreDirectMessagesScreen.open();
        await searchInput.typeText(testBot.username);
        await getUserAtIndex(0).tap();
        await startButton.tap();

        // # Open bot profile from channel intro
        await getChannelIntroProfilePicture(testBot.user_id).tap();

        // * Verify bot profile
        await UserProfileScreen.toBeVisible();
        await expect(element(by.text(`@${testBot.username}`))).toBeVisible();
        await expect(getProfilePicture(testBot.user_id)).toBeVisible();
        await expect(userProfileBotTag).toBeVisible();
        await expect(sendMessageAction.atIndex(0)).toBeVisible();
        await expect(additionalOptionsAction).not.toBeVisible();
        await expect(localTimeLabel).not.toBeVisible();

        // # Go back to channel
        await UserProfileScreen.close();
    });
});
