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
    Setup,
} from '@support/server_api';

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

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3187 Unread channels sort at top', async () => {
        const {openMainSidebar} = ChannelScreen;
        const {
            getChannelByDisplayName,
            hasChannelDisplayNameAtIndex,
        } = MainSidebar;

        // # Open main sidebar (with at least one unread channel)
        await openMainSidebar();

        // * Verify unread channel(s) display at top of channel list (with mentions first, if any), in alphabetical order, with title "Unreads"
        await expect(element(by.text('UNREADS'))).toBeVisible();
        await hasChannelDisplayNameAtIndex(0, aChannel.display_name);
        await hasChannelDisplayNameAtIndex(1, newChannel.display_name);
        await hasChannelDisplayNameAtIndex(2, zChannel.display_name);

        // # Tap an unread channel to view it
        await getChannelByDisplayName(aChannel.display_name).tap();
        await openMainSidebar();
        await getChannelByDisplayName(newChannel.display_name).tap();
        await openMainSidebar();
        await getChannelByDisplayName(zChannel.display_name).tap();

        // * Channel you just read is no longer listed in Unreads
        await openMainSidebar();
        await expect(element(by.text('UNREADS'))).not.toBeVisible();
        await expect(element(by.text('PUBLIC CHANNELS'))).toBeVisible();
        await hasChannelDisplayNameAtIndex(0, aChannel.display_name);
        await hasChannelDisplayNameAtIndex(1, newChannel.display_name);
        await hasChannelDisplayNameAtIndex(2, 'Off-Topic');
        await hasChannelDisplayNameAtIndex(3, 'Town Square');
        await hasChannelDisplayNameAtIndex(4, zChannel.display_name);
        await getChannelByDisplayName(aChannel.display_name).tap();
    });
});
