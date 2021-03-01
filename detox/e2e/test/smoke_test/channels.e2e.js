// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {
    Channel,
    Post,
    Preference,
    Setup,
    Team,
    User,
} from '@support/server_api';

describe('Channels', () => {
    let testMessage;
    let unreadChannel;
    let favoriteChannel;
    let publicChannel;
    let privateChannel;
    let nonJoinedChannel;
    let directMessageChannel;
    let dmOtherUser;
    let nonDmOtherUser;
    const {
        channelNavBarTitle,
        closeMainSidebar,
        openMainSidebar,
    } = ChannelScreen;
    const {
        getChannelByDisplayName,
        getFilteredChannelByDisplayName,
        hasChannelDisplayNameAtIndex,
        hasFilteredChannelDisplayNameAtIndex,
        searchInput,
    } = MainSidebar;

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit();
        unreadChannel = channel;
        testMessage = `Mention @${user.username}`;
        await Post.apiCreatePost({
            channelId: unreadChannel.id,
            message: testMessage,
        });

        ({channel: favoriteChannel} = await Channel.apiCreateChannel({type: 'O', prefix: '4-favorite-channel', teamId: team.id}));
        await Channel.apiAddUserToChannel(user.id, favoriteChannel.id);
        await Preference.apiSaveFavoriteChannelPreference(user.id, favoriteChannel.id);

        ({channel: publicChannel} = await Channel.apiCreateChannel({type: 'O', prefix: '3-public-channel', teamId: team.id}));
        await Channel.apiAddUserToChannel(user.id, publicChannel.id);

        ({channel: privateChannel} = await Channel.apiCreateChannel({type: 'P', prefix: '2-private-channel', teamId: team.id}));
        await Channel.apiAddUserToChannel(user.id, privateChannel.id);

        ({channel: nonJoinedChannel} = await Channel.apiCreateChannel({type: 'O', prefix: '1-non-joined-channel', teamId: team.id}));

        ({user: dmOtherUser} = await User.apiCreateUser({prefix: 'testchannel-1'}));
        ({channel: directMessageChannel} = await Channel.apiCreateDirectChannel([user.id, dmOtherUser.id]));
        await Post.apiCreatePost({
            channelId: directMessageChannel.id,
            message: testMessage,
        });

        ({user: nonDmOtherUser} = await User.apiCreateUser({prefix: 'testchannel-2'}));
        await Team.apiAddUserToTeam(nonDmOtherUser.id, team.id);

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3184 should display unfiltered channels list', async () => {
        // # Open main sidebar
        await openMainSidebar();

        // * Verify order when all channels are unread
        await hasChannelDisplayNameAtIndex(0, privateChannel.display_name);
        await hasChannelDisplayNameAtIndex(1, publicChannel.display_name);
        await hasChannelDisplayNameAtIndex(2, favoriteChannel.display_name);
        await hasChannelDisplayNameAtIndex(3, unreadChannel.display_name);
        await hasChannelDisplayNameAtIndex(4, dmOtherUser.username);
        await hasChannelDisplayNameAtIndex(5, 'Off-Topic');
        await hasChannelDisplayNameAtIndex(6, 'Town Square');
        await expect(element(by.id(nonJoinedChannel.display_name))).not.toBeVisible();
        await expect(element(by.id(nonDmOtherUser.username))).not.toBeVisible();

        // # Visit private, public, favorite, and direct message channels
        await getChannelByDisplayName(privateChannel.display_name).tap();
        await openMainSidebar();
        await getChannelByDisplayName(publicChannel.display_name).tap();
        await openMainSidebar();
        await getChannelByDisplayName(favoriteChannel.display_name).tap();
        await openMainSidebar();
        await getChannelByDisplayName(dmOtherUser.username).tap();
        await openMainSidebar();

        // * Verify order when all channels are read except for unread channel
        await hasChannelDisplayNameAtIndex(0, unreadChannel.display_name);
        await hasChannelDisplayNameAtIndex(1, favoriteChannel.display_name);
        await hasChannelDisplayNameAtIndex(2, publicChannel.display_name);
        await hasChannelDisplayNameAtIndex(3, 'Off-Topic');
        await hasChannelDisplayNameAtIndex(4, 'Town Square');
        await hasChannelDisplayNameAtIndex(5, privateChannel.display_name);
        await hasChannelDisplayNameAtIndex(6, dmOtherUser.username);
        await expect(element(by.id(nonJoinedChannel.display_name))).not.toBeVisible();
        await expect(element(by.id(nonDmOtherUser.username))).not.toBeVisible();

        // # Close main sidebar
        await closeMainSidebar();
    });

    it('MM-T3186 should display filtered channels list and be able to change channels', async () => {
        // # Open main sidebar
        await openMainSidebar();

        // # Enter search term
        await searchInput.typeText('channel');
        await searchInput.tapBackspaceKey();

        // * Verify order when channels list is filtered
        await hasFilteredChannelDisplayNameAtIndex(0, unreadChannel.display_name);
        await hasFilteredChannelDisplayNameAtIndex(1, dmOtherUser.username);
        await hasFilteredChannelDisplayNameAtIndex(2, privateChannel.display_name);
        await hasFilteredChannelDisplayNameAtIndex(3, publicChannel.display_name);
        await hasFilteredChannelDisplayNameAtIndex(4, favoriteChannel.display_name);
        await hasFilteredChannelDisplayNameAtIndex(5, nonDmOtherUser.username);
        await hasFilteredChannelDisplayNameAtIndex(6, nonJoinedChannel.display_name);
        await expect(element(by.text('Off-Topic'))).not.toBeVisible();
        await expect(element(by.text('Town Square'))).not.toBeVisible();

        // # Tap a channel from filtered list
        await getFilteredChannelByDisplayName(unreadChannel.display_name).tap();

        // * Verify filtered channel opens
        await expect(channelNavBarTitle).toHaveText(unreadChannel.display_name);

        // # Close main sidebar
        await closeMainSidebar();
    });
});
