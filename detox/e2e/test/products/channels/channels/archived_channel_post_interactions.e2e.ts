// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Post-level archived-channel tests split from archived_channel_interactions.e2e.ts for CI time limits.

import {Channel, Post, Setup, System, User} from '@support/server_api';
import client from '@support/server_api/client';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    SavedMessagesScreen,
    ServerScreen,
    closeArchivedChannel,
    openArchivedChannel,
} from '@support/ui/screen';
import {
    isAndroid,
    timeouts,
    wait,
    waitForElementToBeVisible,
} from '@support/utils';
import {expect, waitFor} from 'detox';

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

    it('MM-T1720_1 - should not be able to interact with existing reactions in an archived channel', async () => {
        // # Create a public channel, post a unique searchable message,
        // add a reaction via API, and archive the channel.
        //
        // Log in as testUser before adding the reaction: the shared API client
        // is authenticated as admin, but POST /api/v4/reactions requires the
        // user_id in the payload to match the session user. Admin has
        // manage_system permission but the server may still reject mismatched
        // user_id on some versions (returns 403). Logging in as the target
        // user avoids this — same pattern as emojis_and_reactions.e2e.ts.
        const message = `archived-reaction-existing-${Date.now()}`;
        const {channel: archivedChannel} = await Channel.apiCreateChannel(
            siteOneUrl,
            {type: 'O', teamId: testTeam.id},
        );
        await Channel.apiAddUserToChannel(
            siteOneUrl,
            testUser.id,
            archivedChannel.id,
        );
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: archivedChannel.id,
            message,
        });

        await User.apiLogin(siteOneUrl, {username: testUser.newUser.username, password: testUser.newUser.password});
        await client.post(`${siteOneUrl}/api/v4/reactions`, {
            user_id: testUser.id,
            post_id: post.id,
            emoji_name: '+1',
            create_at: 0,
        });
        await User.apiAdminLogin(siteOneUrl);

        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open the archived channel via the platform-appropriate path.
        await openArchivedChannel(archivedChannel.name, message);

        // * Verify the existing reaction is visible on the archived post
        const reactionEmoji = element(
            by.id('reaction.emoji.+1').withAncestor(by.id(`channel.post_list.post.${post.id}`)),
        );
        await waitFor(reactionEmoji).toExist().withTimeout(timeouts.TEN_SEC);

        // # Long-press on the post to open post options and verify reactions cannot be added
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.toBeVisible();

        // * Verify neither the reaction bar nor pick reaction button is visible (archived channel)
        await expect(PostOptionsScreen.pickReactionButton).not.toBeVisible();

        // # Close post options and return to channel list
        await PostOptionsScreen.close();
        await closeArchivedChannel();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T1722_1 - should show reply/jump arrow in saved messages for posts from archived channels', async () => {
        // iOS uses the search/permalink fallback path (MM-T1679_1 path) because
        // tapping an archived channel in Browse Channels does not reliably navigate
        // on iOS in CI. See openArchivedChannel().

        // # Create a public channel, post a unique searchable message,
        // and archive the channel via API.
        const message = `saved-post-archived-channel-${Date.now()}`;
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

        // # Long-press the post to open post options, then save it
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.toBeVisible();

        await PostOptionsScreen.tapSavePost();
        await wait(timeouts.ONE_SEC);

        // # Close the archived channel and navigate to saved messages
        await closeArchivedChannel();
        await ChannelListScreen.toBeVisible();

        // # Open saved messages screen
        await SavedMessagesScreen.open();

        // * Verify the saved post from the archived channel is displayed in saved messages
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(
            post.id,
            message,
        );
        await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(postListPostItem).toBeVisible();

        // * Verify the channel info (jump link) is visible on the saved post from the archived channel.
        // Poll the assertion: the inner Text inside the channel-info row can finish its layout
        // pass a frame or two after the parent post item becomes visible on Android Fabric,
        // which makes a single-shot expect().toBeVisible() return "Got: was null" from Espresso's
        // getGlobalVisibleRect() (matcher resolves the view, but its rect isn't computable yet).
        const {postListPostItemChannelInfoChannelDisplayName} =
            SavedMessagesScreen.getPostListPostItem(post.id, message);
        if (isAndroid()) {
            await waitFor(postListPostItemChannelInfoChannelDisplayName).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitFor(postListPostItemChannelInfoChannelDisplayName).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T1716 - should not show post input box in archived channels (read-only, cannot post)', async () => {
        // iOS uses the search/permalink fallback path (MM-T1679_1 path) because
        // tapping an archived channel in Browse Channels does not reliably navigate
        // on iOS in CI. See openArchivedChannel().

        // # Create a public channel, post a unique searchable sentinel, and archive it.
        const message = `archived-no-postbox-${Date.now()}`;
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
        await Channel.apiDeleteChannel(siteOneUrl, archivedChannel.id);
        await wait(timeouts.FOUR_SEC);

        // # Open the archived channel via the platform-appropriate path.
        await openArchivedChannel(archivedChannel.name, message);

        // * Verify main thread has no active post input box
        await expect(ChannelScreen.postInput).not.toBeVisible();

        // * Verify the close channel button is visible
        if (isAndroid()) {
            await waitFor(ChannelScreen.postDraftArchivedCloseChannelButton).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            await waitForElementToBeVisible(
                ChannelScreen.postDraftArchivedCloseChannelButton,
                timeouts.TEN_SEC,
            );
        }

        // # Navigate back to channel list
        await closeArchivedChannel();

        // * Verify back on channel list screen
        await ChannelListScreen.toBeVisible();
    });
});
