// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toChannelScreen} from '@support/ui/screen';

import {Setup} from '@support/server_api';

describe('Messaging', () => {
    let newChannel;

    beforeAll(async () => {
        const {user, channel} = await Setup.apiInit();
        newChannel = channel;

        await toChannelScreen(user);
    });

    it('should post a message on tap to paper send button', async () => {
        await expect(element(by.id('channel_screen'))).toBeVisible();
        await expect(element(by.id('post_input'))).toExist();
        await expect(element(by.id('send_button'))).not.toExist();
        await element(by.id('post_input')).tap();

        const text = Date.now().toString();
        await element(by.id('post_input')).typeText(text);

        await expect(element(by.id('send_button'))).toBeVisible();
        await element(by.id('send_button')).tap();

        await expect(element(by.text(text))).toExist();
    });

    it('MM-T3187 Unread channels sort at top', async () => {
        // # Open channel drawer (with at least one unread channel)
        await element(by.id('channel_drawer_button')).tap();
        await expect(element(by.id('channels_list'))).toBeVisible();

        // # Verify unread channel(s) display at top of channel list (with mentions first, if any), in alphabetical order, with title "Unreads"
        await expect(element(by.text('UNREADS'))).toBeVisible();
        await expect(element(by.id('channel_item_display_name')).atIndex(0)).toHaveText(newChannel.display_name);

        // # Tap an unread channel to view it
        await element(by.text(newChannel.display_name)).tap();

        // # Open channel drawer again
        await element(by.id('channel_drawer_button')).tap();
        await expect(element(by.id('channels_list'))).toBeVisible();

        // * Channel you just read is no longer listed in Unreads
        await expect(element(by.text('PUBLIC CHANNELS'))).toBeVisible();
        await expect(element(by.text('UNREADS'))).not.toBeVisible();
        await expect(element(by.text(newChannel.display_name)).atIndex(1)).toBeVisible();
    });
});
