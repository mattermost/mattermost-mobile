// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toChannelScreen} from '@support/ui/screen';

import {Setup, Channel} from '@support/server_api';

describe('Unread channels', () => {
    let newChannel;
    let aChannel;
    let zChannel;

    beforeAll(async () => {
        const {user, channel, team} = await Setup.apiInit();
        newChannel = channel;

        let ch;

        ch = await Channel.apiCreateChannel({type: 'O', prefix: 'a-channel', teamId: team.id});
        aChannel = ch.channel;
        await Channel.apiAddUserToChannel(user.id, aChannel.id);

        ch = await Channel.apiCreateChannel({type: 'O', prefix: 'z-channel', teamId: team.id});
        zChannel = ch.channel;
        await Channel.apiAddUserToChannel(user.id, zChannel.id);

        await toChannelScreen(user);
    });

    it('MM-T3187 Unread channels sort at top', async () => {
        // # Open channel drawer (with at least one unread channel)
        await element(by.id('channel_drawer.button')).tap();

        // # Verify unread channel(s) display at top of channel list (with mentions first, if any), in alphabetical order, with title "Unreads"
        await expect(element(by.text('UNREADS'))).toBeVisible();
        await expect(element(by.id('channel_item.display_name').withAncestor(by.id('channels_list'))).atIndex(0)).toHaveText(aChannel.display_name);
        await expect(element(by.id('channel_item.display_name').withAncestor(by.id('channels_list'))).atIndex(1)).toHaveText(newChannel.display_name);
        await expect(element(by.id('channel_item.display_name').withAncestor(by.id('channels_list'))).atIndex(2)).toHaveText(zChannel.display_name);

        // # Tap an unread channel to view it
        await element(by.text(newChannel.display_name)).tap();

        // # Open channel drawer again
        await element(by.id('channel_drawer.button')).tap();

        // * Channel you just read is no longer listed in Unreads
        await expect(element(by.text('UNREADS'))).toBeVisible();
        await expect(element(by.text('PUBLIC CHANNELS'))).toBeVisible();
        await expect(element(by.id('channel_item.display_name').withAncestor(by.id('channels_list'))).atIndex(0)).toHaveText(aChannel.display_name);
        await expect(element(by.id('channel_item.display_name').withAncestor(by.id('channels_list'))).atIndex(1)).toHaveText(zChannel.display_name);
        await expect(element(by.id('channel_item.display_name').withAncestor(by.id('channels_list'))).atIndex(2)).toHaveText('Off-Topic');
        await expect(element(by.id('channel_item.display_name').withAncestor(by.id('channels_list'))).atIndex(3)).toHaveText(newChannel.display_name);
    });
});