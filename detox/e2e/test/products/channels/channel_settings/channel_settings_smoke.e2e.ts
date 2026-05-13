// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T844: RN apps: Display channel list
 * - MM-T847: RN apps: Change channel
 * - MM-T849: RN apps: Display Channel Info
 * - MM-T851: RN apps: Pinned Messages
 */

import {Post, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    EditPostScreen,
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    PinnedMessagesScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channel Settings - Smoke', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T844 - RN apps: Display channel list', async () => {
        // * Verify channel list screen is visible with categorized sections
        await expect(ChannelListScreen.channelListScreen).toBeVisible();

        // * Verify "channels" category header is visible
        await expect(ChannelListScreen.getCategoryHeaderDisplayName(channelsCategory)).toBeVisible();
    });

    it('MM-T847 - RN apps: Change channel', async () => {
        // # Open the Jump to... (Find channels) screen
        await FindChannelsScreen.open();

        // # Type the full channel name and submit to trigger filtered results
        await FindChannelsScreen.searchInput.replaceText(testChannel.name);
        await FindChannelsScreen.searchInput.tapReturnKey();

        // * Verify the channel appears in the filtered list
        await waitFor(FindChannelsScreen.getFilteredChannelItem(testChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap on the channel from the filtered list
        await FindChannelsScreen.getFilteredChannelItem(testChannel.name).tap();

        // # Dismiss scheduled post tooltip if it appears on channel open
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify the tapped channel opens in view
        await waitFor(ChannelScreen.channelScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Return to channel list
        await ChannelScreen.back();
    });

    it('MM-T849 - RN apps: Display Channel Info', async () => {
        // # Open a channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Tap on the channel name in the bar at the top of the screen
        await ChannelInfoScreen.open();

        // * Verify Channel Info is displayed
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toBeVisible();

        // # Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T851 - RN apps: Pinned Messages', async () => {
        const pinnedText = 'Pinned';

        // # Post a message to the channel via API and pin it via the UI
        const message = `Pinned message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Pin the message via post options
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.pinPostOption.tap();

        // * Verify pinned pre-header is shown on the post
        await wait(timeouts.ONE_SEC);
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItemPreHeaderText).toHaveText(pinnedText);

        // # Open Channel Info and navigate to Pinned Messages
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify Pinned Messages list opens and shows the pinned post (Step 1A assertion)
        await PinnedMessagesScreen.toBeVisible();
        const {postListPostItem: pinnedPostItem} = PinnedMessagesScreen.getPostListPostItem(post.id, message);
        await expect(pinnedPostItem).toBeVisible();

        // # Tap on the pinned post to open the popup/permalink view (Step 2)
        await pinnedPostItem.tap();
        await waitFor(PermalinkScreen.jumpToRecentMessagesButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify popup view shows the pinned message with option to Jump to recent messages
        await expect(PermalinkScreen.jumpToRecentMessagesButton).toBeVisible();

        // # Jump to recent messages to return to channel
        await PermalinkScreen.jumpToRecentMessages();
        await ChannelScreen.toBeVisible();

        // # Re-open pinned messages for Step 3 (navigate to post directly as thread)
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();
        await PinnedMessagesScreen.toBeVisible();

        // # Long press pinned message and reply to open it in thread view (arrow/reply option)
        await PostOptionsScreen.openPostOptionsForPinedPosts(post.id);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify opens pinned message in a thread
        await ThreadScreen.toBeVisible();

        // # Go back to pinned messages from thread
        await ThreadScreen.back();

        // # Long press on the pinned message and edit it (Step 4)
        await PostOptionsScreen.openPostOptionsForPinedPosts(post.id);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit the message and save
        const updatedMessage = `${message} edited`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();

        // * Verify post is edited and saves as one copy, not a duplicate
        const {postListPostItem: updatedPinnedPostItem} = PinnedMessagesScreen.getPostListPostItem(post.id);
        await waitFor(updatedPinnedPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.assertPostMessageEdited(post.id, updatedMessage, 'pinned_page');

        // # Go back to channel list
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
