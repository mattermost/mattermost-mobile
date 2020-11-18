// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';

import {Setup, Team, User} from '@support/server_api';
import {serverUrl} from '@support/test_config';

describe('Messaging', () => {
    let testChannel;
    let testTeam;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit();
        testChannel = channel;
        testTeam = team;

        await ChannelScreen.open(user);
    });

    it('MM-T3471 Tapping channel URL link joins public channel', async () => {
        // # Go to the Town Square channel
        const {channelNavBarTitle} = ChannelScreen;
        await ChannelScreen.openMainSidebar();
        let channelItem = MainSidebar.getChannelByDisplayName('Town Square');
        await channelItem.tap();
        await expect(channelNavBarTitle).toHaveText('Town Square');

        // # There's no way to get a channel permalink on mobile so we make one
        // manually
        const channelPermalink = `${serverUrl}/${testTeam.name}/channels/${testChannel.name}`;

        // # Post the channel permalink to the test channel in Town Square
        const {postInput} = ChannelScreen;
        await expect(postInput).toBeVisible();
        await postInput.tap();
        await postInput.typeText(channelPermalink);
        await ChannelScreen.tapSendButton();
        await expect(element(by.text(channelPermalink))).toBeVisible();

        // # Create another user in the same team, log in and go to town square
        const {user: otherUser} = await User.apiCreateUser({prefix: 'TestUser'});
        await Team.apiAddUserToTeam(otherUser.id, testTeam.id);
        await ChannelScreen.logout();
        await ChannelScreen.open(otherUser);
        await ChannelScreen.openMainSidebar();
        channelItem = MainSidebar.getChannelByDisplayName('Town Square');
        await channelItem.tap();
        await expect(channelNavBarTitle).toHaveText('Town Square');

        // # As this new user, tap the channel permalink we posted earlier
        const permalinkPost = element(by.text(channelPermalink));
        await permalinkPost.tap({x: 5, y: 10});

        // * Confirm that we have joined the correct channel from the channel permalink
        await expect(channelNavBarTitle).toHaveText(testChannel.display_name);
    });
});
