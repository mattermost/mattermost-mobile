// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Team,
    User,
} from '@support/server_api';
import {MainSidebar} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';

describe('Mention Badges', () => {
    const {
        channelNavBarTitle,
        closeMainSidebar,
        goToChannel,
        mainSidebarDrawerButtonBadgeUnreadCount,
        openTeamSidebar,
    } = ChannelScreen;
    const {
        closeTeamSidebar,
        getTeamByDisplayName,
        switchTeamsButtonBadgeUnreadCount,
    } = MainSidebar;
    let testChannel;
    let testPrivateChannel;
    let testPublicChannel;
    let testTeam1;
    let testTeam2;
    let testUser1;
    let testUser2;

    beforeAll(async () => {
        ({user: testUser1} = await User.apiCreateUser());
        ({team: testTeam1} = await Team.apiCreateTeam({prefix: 'team-a'}));
        ({channel: testChannel} = await Channel.apiGetChannelByName(testTeam1.id, 'town-square'));

        ({user: testUser2} = await User.apiCreateUser());
        ({team: testTeam2} = await Team.apiCreateTeam({prefix: 'team-b'}));
        ({channel: testPublicChannel} = await Channel.apiGetChannelByName(testTeam2.id, 'town-square'));

        await Team.apiAddUserToTeam(testUser1.id, testTeam1.id);
        await Team.apiAddUserToTeam(testUser1.id, testTeam2.id);
        await Team.apiAddUserToTeam(testUser2.id, testTeam1.id);
        await Team.apiAddUserToTeam(testUser2.id, testTeam2.id);

        ({channel: testPrivateChannel} = await Channel.apiCreateChannel({type: 'P', teamId: testTeam2.id}));

        await Channel.apiAddUserToChannel(testUser1.id, testPrivateChannel.id);
        await Channel.apiAddUserToChannel(testUser2.id, testPrivateChannel.id);

        // # Open channel screen
        await ChannelScreen.open(testUser1);

        // # Clear unreads and go back to original team and channel
        await openTeamSidebar();
        await getTeamByDisplayName(testTeam2.display_name).tap();
        await goToChannel(testPrivateChannel.display_name);
        await openTeamSidebar();
        await getTeamByDisplayName(testTeam1.display_name).tap();
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T520_1 should display mention badges for public channel', async () => {
        await expectMentionBadges(testPublicChannel);
    });

    it('MM-T520_2 should display mention badges for private channel', async () => {
        await expectMentionBadges(testPrivateChannel);
    });

    const expectMentionBadges = async (messagePostedChannel) => {
        // * Verify team 1 main sidebar drawer button badge does not exist
        await expect(mainSidebarDrawerButtonBadgeUnreadCount).not.toExist();

        // # Post an at-mention message to user 1 by user 2 on a channel
        const testMessage = `Mention @${testUser1.username}`;
        await User.apiLogin(testUser2);
        await Post.apiCreatePost({
            channelId: messagePostedChannel.id,
            message: testMessage,
        });

        // * Verify team 1 main sidebar drawer button badge count is 1
        await expect(channelNavBarTitle).toHaveText(testChannel.display_name);
        await expect(mainSidebarDrawerButtonBadgeUnreadCount).toHaveText('1');

        // * Verify team 2 item badge count is 1
        await openTeamSidebar();
        const {teamItemBadgeUnreadCount: team2ItemBadgeUnreadCount} = await MainSidebar.getTeam(testTeam2.id);
        await expect(team2ItemBadgeUnreadCount).toHaveText('1');

        // * Verify team 1 item badge count does not exist
        const {teamItemBadgeUnreadCount: team1ItemBadgeUnreadCount} = await MainSidebar.getTeam(testTeam1.id);
        await expect(team1ItemBadgeUnreadCount).not.toExist();

        // * Verify switch teams sidebar button badge count is 1
        await closeTeamSidebar();
        await expect(switchTeamsButtonBadgeUnreadCount).toHaveText('1');

        // # Close main sidebar
        await closeMainSidebar();

        // # Clear unreads and go back to original team and channel
        await openTeamSidebar();
        await getTeamByDisplayName(testTeam2.display_name).tap();
        await goToChannel(messagePostedChannel.display_name);
        await openTeamSidebar();
        await getTeamByDisplayName(testTeam1.display_name).tap();
    };
});
