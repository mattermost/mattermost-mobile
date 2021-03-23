// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelAddMembersScreen,
    ChannelInfoScreen,
    ChannelScreen,
} from '@support/ui/screen';
import {
    Setup,
    Team,
    User,
} from '@support/server_api';

describe('Channel Add Members', () => {
    let testChannel;
    let testLastUser;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit();
        testChannel = channel;

        [...Array(100).keys()].forEach(async (key) => {
            const {user: testOtherUser} = await User.apiCreateUser({prefix: `a-${key}-`});
            await Team.apiAddUserToTeam(testOtherUser.id, team.id);
        });
        ({user: testLastUser} = await User.apiCreateUser({prefix: 'z-'}));
        await Team.apiAddUserToTeam(testLastUser.id, team.id);

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3197 should be able load users in long add members list', async () => {
        const {
            addMembersAction,
            channelInfoScrollView,
        } = ChannelInfoScreen;

        // # Open add members screen
        await ChannelScreen.goToChannel(testChannel.display_name);
        await ChannelInfoScreen.open();
        await channelInfoScrollView.scrollTo('bottom');
        await addMembersAction.tap();

        // * Verify user can scroll down multiple times until last user is seen
        await waitFor(ChannelAddMembersScreen.getUserByDisplayUsername(`@${testLastUser.username}`)).toBeVisible().whileElement(by.id(ChannelAddMembersScreen.testID.usersList)).scroll(500, 'down');
        await ChannelAddMembersScreen.back();

        // # Close channel info screen
        await ChannelInfoScreen.close();
    });
});
