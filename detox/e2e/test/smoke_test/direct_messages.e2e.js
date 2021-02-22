// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {
    ChannelInfoScreen,
    ChannelScreen,
    MoreDirectMessagesScreen,
} from '@support/ui/screen';
import {
    Channel,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {getRandomId} from '@support/utils';

describe('Direct Messages', () => {
    const searchTerm = getRandomId();
    let testUser;
    let testOtherUser;
    let townSquareChannel;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit();
        testUser = user;

        ({user: testOtherUser} = await User.apiCreateUser({prefix: searchTerm}));
        await Team.apiAddUserToTeam(testOtherUser.id, team.id);

        ({channel: townSquareChannel} = await Channel.apiGetChannelByName(team.name, 'town-square'));

        // # Open channel screen
        await ChannelScreen.open(testUser);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3215 should be able to close direct message', async () => {
        const {
            channelNavBarTitle,
            closeMainSidebar,
            openMainSidebar,
        } = ChannelScreen;
        const {
            getUserAtIndex,
            searchInput,
            startButton,
        } = MoreDirectMessagesScreen;
        const {getChannelByDisplayName} = MainSidebar;

        // # Create a DM with the other user
        await openMainSidebar();
        await MoreDirectMessagesScreen.open();
        await searchInput.typeText(searchTerm);
        await getUserAtIndex(0).tap();
        await startButton.tap();

        // * Verify DM channel is created
        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.headerDisplayName).toHaveText(testOtherUser.username);
        await ChannelInfoScreen.close();
        await openMainSidebar();
        await getChannelByDisplayName(testOtherUser.username).tap();

        // # Close DM channel
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.leaveAction.tap();

        // * Verify redirected to town square and does not appear in channel list
        await expect(channelNavBarTitle).toHaveText(townSquareChannel.display_name);
        await openMainSidebar();
        await expect(getChannelByDisplayName(testOtherUser.username)).not.toBeVisible();
        await closeMainSidebar();
    });
});
