// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Autocomplete - At-Mention User Filters', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let channelB: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Pre-create channel B BEFORE login so it lands in the initial sidebar sync.
        const {channel: bChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'channel-b',
        });
        if (!bChannel?.id) {
            throw new Error('[beforeAll] Failed to create channel B');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, user.id, bChannel.id);
        channelB = bChannel;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T511_1 - should not show deactivated user in @ mention autocomplete', async () => {
        // # Create a new user, add to team/channel, then deactivate
        const {user: deactivatedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'deact'});
        await Team.apiAddUserToTeam(siteOneUrl, deactivatedUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deactivatedUser.id, testChannel.id);
        await User.apiDeactivateUser(siteOneUrl, deactivatedUser.id);

        // # Open the channel screen and type "@username"
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText(`@${deactivatedUser.username}`);
        await wait(timeouts.ONE_SEC);

        // * Verify the deactivated user does NOT appear in autocomplete suggestions
        const {atMentionItem} = Autocomplete.getAtMentionItem(deactivatedUser.id);
        await expect(atMentionItem).not.toExist();

        // # Clear input and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();
    });

    it('MM-T2349_1 - should match user by nickname in @ autocomplete', async () => {
        // # Create a user with a known nickname (password 16+ chars for server's 14-char minimum).
        const nicknameId = getRandomId();
        const nickname = `nick${nicknameId}`;
        const {user: nicknameUser} = await User.apiCreateUser(siteOneUrl, {
            user: {
                email: `nickuser${nicknameId}@sample.mattermost.com`,
                username: `nickuser${nicknameId}`,
                password: `P${nicknameId}!Test1234`,
                first_name: `FN${nicknameId}`,
                last_name: `LN${nicknameId}`,
                nickname,
            },
        });
        if (!nicknameUser?.id) {
            throw new Error('[MM-T2349_1] Failed to create nickname user');
        }
        await Team.apiAddUserToTeam(siteOneUrl, nicknameUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, nicknameUser.id, testChannel.id);

        // # Open channel screen and type "@nickname"
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText(`@${nickname}`);

        // * Verify autocomplete is visible and user appears matched by nickname
        await Autocomplete.toBeVisible();
        const {atMentionItem} = Autocomplete.getAtMentionItem(nicknameUser.id);
        await expect(atMentionItem).toExist();

        // # Clear input and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();
    });

    it('MM-T132_1 - should show autocomplete independently in each channel draft', async () => {
        // # Open channel A (testChannel) and type a partial @mention
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);

        // * Verify autocomplete is visible in channel A
        await Autocomplete.toBeVisible();

        // # Go back to channel list (saves draft in channel A)
        await ChannelScreen.back();

        // # Open channel B and type the same partial @mention
        await ChannelScreen.open(channelsCategory, channelB.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);

        // * Verify autocomplete works independently in channel B
        await Autocomplete.toBeVisible();
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Clear input in channel B and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();

        // # Return to channel A and verify autocomplete still works
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);

        // * Verify autocomplete is shown in channel A
        await Autocomplete.toBeVisible();

        // # Clear input and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();
    });
});
