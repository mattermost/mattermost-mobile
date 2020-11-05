// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {ChannelSidebar} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';

import {Setup, Team, User} from '@support/server_api';
import {serverUrl} from '@support/test_config';

describe('Channels', () => {
    let testChannel;
    let testTeam;

    beforeAll(async () => {
        const {channel: channel1, team, user} = await Setup.apiInit();
        testChannel = channel1;
        testTeam = team;

        await ChannelScreen.open(user);
    });

    it('should join channel from a permalink', async () => {
        // # Go to the Town Square channel
        const {channelDrawerButton, channelNavBarTitle} = ChannelScreen;
        await channelDrawerButton.tap();
        await ChannelSidebar.toBeVisible();
        let channelItem = ChannelSidebar.getChannelByDisplayName('Town Square');
        await channelItem.tap();
        await expect(channelNavBarTitle).toHaveText('Town Square');

        // # There's no way to get a channel permalink on mobile so we make one
        // manually
        const permalink = `${serverUrl}/${testTeam.name}/channels/${testChannel.name}`;

        // # Post the permalink to the test channel in Town Square
        const {postInput, sendButton} = ChannelScreen;
        await expect(postInput).toBeVisible();
        await expect(sendButton).not.toExist();
        await postInput.tap();
        await postInput.typeText(permalink);
        await expect(sendButton).toBeVisible();
        await sendButton.tap();
        await expect(element(by.text(permalink))).toBeVisible();

        // # Create another user in the same team, log in and go to town square
        const {user: otherUser} = await User.apiCreateUser({prefix: 'TestUser'});
        await Team.apiAddUserToTeam(otherUser.id, testTeam.id);
        await ChannelScreen.logout();
        await ChannelScreen.open(otherUser);
        await channelDrawerButton.tap();
        await ChannelSidebar.toBeVisible();
        channelItem = ChannelSidebar.getChannelByDisplayName('Town Square');
        await channelItem.tap();
        await expect(channelNavBarTitle).toHaveText('Town Square');

        // # As this new user, Tap the permalink we posted earlier
        const permalinkPost = element(by.text(permalink));
        await permalinkPost.tap({x: 5, y: 10});

        // * Confirm that we have joined the correct channel from the permalink
        await expect(channelNavBarTitle).toHaveText(testChannel.display_name);
    });
});
