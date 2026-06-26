// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Post-level archived-channel tests split from archived_channel_interactions.e2e.ts for CI time limits.

import {Channel, Post, Setup, System} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    closeArchivedChannel,
    openArchivedChannel,
} from '@support/ui/screen';
import {
    timeouts,
    wait,
} from '@support/utils';
import {expect} from 'detox';

// Android skipped — Detox/Fabric text-input idle check crashes on API 35.
describe('Channels - Archived Channel Post Interactions', () => {
    const serverOneDisplayName = 'Server 1';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        // # Ensure archived channels are visible in browse channels
        await System.apiUpdateConfig(siteOneUrl, {
            TeamSettings: {ExperimentalViewArchivedChannels: true},
        });
        await wait(timeouts.ONE_SEC);

        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // Dismiss any lingering "Removed from channel" or "Archived channel"
        // dialogs that may have appeared asynchronously via WebSocket events
        // from the previous test's channel archival. These native Alert dialogs
        // block all Detox interactions until dismissed.
        await Alert.dismissChannelRemoveOrArchiveAlert();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T1718_1 - should not show add reaction option in post options for archived channels', async () => {
        // # Create a public channel, post a unique searchable message, and archive it.
        const message = `archived-channel-reaction-test-${Date.now()}`;
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message,
        });
        const {post} = await Post.apiGetLastPostInChannel(
            siteOneUrl,
            archivedChannel.id,
        );
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open the archived channel via the platform-appropriate path.
        await openArchivedChannel(archivedChannel.name, message);

        // # Long-press on the post to open post options
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.toBeVisible();

        // * Verify the reaction bar / add reaction button is NOT visible (archived channels cannot add reactions)
        await expect(PostOptionsScreen.pickReactionButton).not.toBeVisible();

        // # Close post options and return to channel list
        await PostOptionsScreen.close();
        await closeArchivedChannel();
        await ChannelListScreen.toBeVisible();
    });
});
