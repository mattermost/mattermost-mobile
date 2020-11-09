// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {ChannelScreen} from '@support/ui/screen';
import {ChannelSidebar} from '@support/ui/component';
import {Setup, Channel} from '@support/server_api';

describe('Unread channels', () => {
    let newChannel;
    let aChannel;
    let zChannel;

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit();
        newChannel = channel;

        ({channel: aChannel} = await Channel.apiCreateChannel({type: 'O', prefix: 'a-channel', teamId: team.id}));
        await Channel.apiAddUserToChannel(user.id, aChannel.id);

        ({channel: zChannel} = await Channel.apiCreateChannel({type: 'O', prefix: 'z-channel', teamId: team.id}));
        await Channel.apiAddUserToChannel(user.id, zChannel.id);

        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3187 Unread channels sort at top', async () => {
        const {channelDrawerButton} = ChannelScreen;

        // # Open channel drawer (with at least one unread channel)
        await channelDrawerButton.tap();

        // * Channel should be visible
        await ChannelSidebar.toBeVisible();

        // * Verify unread channel(s) display at top of channel list (with mentions first, if any), in alphabetical order, with title "Unreads"
        await expect(element(by.text('UNREADS'))).toBeVisible();
        await ChannelSidebar.hasChannelAtIndex(0, aChannel.display_name);
        await ChannelSidebar.hasChannelAtIndex(1, newChannel.display_name);
        await ChannelSidebar.hasChannelAtIndex(2, zChannel.display_name);

        // # Tap an unread channel to view it
        await ChannelSidebar.getChannelByDisplayName(aChannel.display_name).tap();
        await channelDrawerButton.tap();
        await ChannelSidebar.getChannelByDisplayName(newChannel.display_name).tap();
        await channelDrawerButton.tap();
        await ChannelSidebar.getChannelByDisplayName(zChannel.display_name).tap();

        // # Open channel drawer again
        await channelDrawerButton.tap();

        // * Channel you just read is no longer listed in Unreads
        await expect(element(by.text('UNREADS'))).not.toBeVisible();
        await expect(element(by.text('PUBLIC CHANNELS'))).toBeVisible();
        await ChannelSidebar.hasChannelAtIndex(0, aChannel.display_name);
        await ChannelSidebar.hasChannelAtIndex(1, newChannel.display_name);
        await ChannelSidebar.hasChannelAtIndex(2, 'Off-Topic');
        await ChannelSidebar.hasChannelAtIndex(3, 'Town Square');
        await ChannelSidebar.hasChannelAtIndex(4, zChannel.display_name);
        await ChannelSidebar.getChannelByDisplayName(aChannel.display_name).tap();
    });
});
