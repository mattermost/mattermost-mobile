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
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Calls - DM Call Button', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const directMessagesCategory = 'direct_messages';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let dmChannel: any;
    let gmChannel: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Create DM channel and post a message BEFORE login so it shows in the sidebar on first load
        const {user: dmUser} = await User.apiCreateUser(siteOneUrl);
        if (!dmUser?.id) {
            throw new Error('[beforeAll] Failed to create dmUser for DM');
        }
        await Team.apiAddUserToTeam(siteOneUrl, dmUser.id, testTeam.id);
        const {channel: dm} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, dmUser.id]);
        if (!dm?.id) {
            throw new Error('[beforeAll] Failed to create DM channel');
        }
        dmChannel = dm;
        await Post.apiCreatePost(siteOneUrl, {channelId: dmChannel.id, message: `DM message ${getRandomId()}`});

        // # Create GM channel and post a message BEFORE login so it shows in the sidebar on first load
        const {user: gmUser1} = await User.apiCreateUser(siteOneUrl);
        if (!gmUser1?.id) {
            throw new Error('[beforeAll] Failed to create gmUser1 for GM');
        }
        await Team.apiAddUserToTeam(siteOneUrl, gmUser1.id, testTeam.id);
        const {user: gmUser2} = await User.apiCreateUser(siteOneUrl);
        if (!gmUser2?.id) {
            throw new Error('[beforeAll] Failed to create gmUser2 for GM');
        }
        await Team.apiAddUserToTeam(siteOneUrl, gmUser2.id, testTeam.id);
        const {channel: gm} = await Channel.apiCreateGroupChannel(siteOneUrl, [testUser.id, gmUser1.id, gmUser2.id]);
        if (!gm?.id) {
            throw new Error('[beforeAll] Failed to create GM channel');
        }
        gmChannel = gm;
        await Post.apiCreatePost(siteOneUrl, {channelId: gmChannel.id, message: `GM message ${getRandomId()}`});

        // # Log in to server — DM/GM channels with messages already exist so they load into sidebar
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('should display the call button in the header of a direct message channel', async () => {
        // # Open a direct message channel screen
        await ChannelListScreen.ensureCategoryExpanded(directMessagesCategory);
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, dmChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.open(directMessagesCategory, dmChannel.name);

        // * Verify the call button is displayed in the channel header
        await waitFor(ChannelScreen.quickCallButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('should not display the call button in the header of a group message channel', async () => {
        // # Open a group message channel screen
        await ChannelListScreen.ensureCategoryExpanded(directMessagesCategory);
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, gmChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.open(directMessagesCategory, gmChannel.name);

        // * Verify the call button is not displayed in the channel header
        await expect(ChannelScreen.quickCallButton).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('should not display the call button in the header of a public channel', async () => {
        // # Open a public channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the call button is not displayed in the channel header
        await expect(ChannelScreen.quickCallButton).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('should not display the start call option on channel info for a direct message channel', async () => {
        // # Open a direct message channel screen and open channel info screen
        await ChannelListScreen.ensureCategoryExpanded(directMessagesCategory);
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, dmChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.open(directMessagesCategory, dmChannel.name);
        await ChannelInfoScreen.open();

        // * Verify the start call action is not displayed — DM calls are started from the header
        // call button instead, so the quick action is suppressed for direct messages.
        await expect(ChannelInfoScreen.joinStartCallAction).not.toExist();

        // # Close channel info screen and go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
