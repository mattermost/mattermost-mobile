// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Shared helpers for opening an archived channel in tests.
//
// Platform split:
//   Android — Browse Channels → archived filter → tap channel (baseline flow;
//             search/permalink regressed MM-T1671_1 + MM-T1722_1).
//   iOS     — search → permalink → jumpToRecentMessages (Browse Channels tap
//             does not reliably navigate on iOS in CI).

import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import BrowseChannelsScreen from '@support/ui/screen/browse_channels';
import ChannelScreen from '@support/ui/screen/channel';
import ChannelDropdownMenuScreen from '@support/ui/screen/channel_dropdown_menu';
import PermalinkScreen from '@support/ui/screen/permalink';
import SearchMessagesScreen from '@support/ui/screen/search_messages';
import {
    isAndroid,
    safeEnableSynchronization,
    timeouts,
    wait,
    waitForElementToBeVisible,
    waitForElementToExist,
} from '@support/utils';
import {waitFor} from 'detox';

// Open Browse Channels and select the Archived filter.
// Exported because some tests still need to verify Browse-Channels-specific
// UI state (e.g. archived dropdown text) independent of channel navigation.
export async function openArchivedChannelsFilter() {
    await ChannelDropdownMenuScreen.open();
    await wait(timeouts.ONE_SEC);

    // Keep Detox sync enabled for this tap. device.log from CI run 28341945446
    // (shard-7, MM-T1685/T1718) shows addViewAt Fabric races when sync is disabled
    // immediately before tapping browse_channels.dropdown_slideup_item.archived_channels.
    await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
    await wait(timeouts.TWO_SEC);
}

// Ensure the archived channel has a searchable sentinel post so the
// search/permalink fallback path can find it. Posts must be created BEFORE
// the channel is archived (server rejects posts on archived channels).
//
// Returns the unique sentinel message that was posted, which the caller
// can hand to openArchivedChannelViaSearchPermalink().
export async function postArchivedChannelSentinel(channelId: string): Promise<{sentinel: string; postId: string}> {
    const sentinel = `archived-channel-sentinel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const {post, error} = await Post.apiCreatePost(siteOneUrl, {channelId, message: sentinel});
    if (error || !post?.id) {
        throw new Error(`Failed to create archived-channel sentinel: ${JSON.stringify(error ?? 'missing post id')}`);
    }
    return {sentinel, postId: post.id};
}

// Navigate to an archived channel via Browse Channels → archived filter → tap.
// Android-only: the search/permalink path regressed MM-T1671_1 + MM-T1722_1.
//
// We skip the searchInput.replaceText step that prior implementations used:
// browse_channels.search_bar.search.input never lands in the Android view
// hierarchy as a Detox-findable view (confirmed by 0 hits across all 20 Android
// shard device.logs in CI run 28290273101). Waiting on a never-present testID
// times out regardless of whether you use toBeVisible or toExist. The archived-
// filter pre-loads recently-archived channels at the top of the list, so tapping
// directly works as long as we wait for the channel item itself to exist.
async function waitForArchivedChannelItem(channelName: string) {
    const channelItem = BrowseChannelsScreen.getChannelItem(channelName);
    await wait(timeouts.TWO_SEC);

    /* eslint-disable no-await-in-loop -- scroll until archived channel appears in list */
    for (let attempt = 0; attempt < 12; attempt++) {
        try {
            await waitFor(channelItem).toExist().withTimeout(timeouts.THREE_SEC);
            return channelItem;
        } catch {
            if (attempt === 11) {
                throw new Error(`Archived channel item not found: ${channelName}`);
            }
            try {
                await BrowseChannelsScreen.flatChannelList.scroll(300, 'down');
            } catch {
                // List may not need scrolling
            }
            await wait(timeouts.ONE_SEC);
        }
    }
    /* eslint-enable no-await-in-loop */

    return channelItem;
}

async function openArchivedChannelViaBrowseChannels(channelName: string) {
    await BrowseChannelsScreen.open();
    await BrowseChannelsScreen.dismissScheduledPostTooltip();
    await openArchivedChannelsFilter();

    const channelItem = await waitForArchivedChannelItem(channelName);
    await channelItem.tap();

    await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
    if (isAndroid()) {
        await waitForElementToExist(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } else {
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    }
}

// Navigate to an archived channel via the search results permalink flow.
// iOS-only: Browse Channels tap does not reliably navigate on iOS in CI.
//
// Uses postId (not text) to locate the search result: Mattermost's search renderer
// splits the post message text across multiple native Text nodes for highlighting,
// so by.text(fullSentinel) finds no single element. by.id('...post.{postId}') is
// stable regardless of how the text is split.
async function openArchivedChannelViaSearchPermalink(searchableMessage: string, postId: string) {
    await SearchMessagesScreen.open();
    await SearchMessagesScreen.searchInput.replaceText(searchableMessage);

    // Pass '' (not searchableMessage) so getPostItemMatcher returns a pure by.id() matcher.
    // Mattermost's search renderer splits the post message text across multiple native Text
    // nodes for highlighting — by.text(fullSentinel) finds nothing. by.id('...post.{postId}')
    // targets the TouchableHighlight container directly and is not affected by text splitting.
    const searchResultElement = SearchMessagesScreen.postList.getPost(postId, '').postListPostItem;

    const maxAttempts = 5;
    const backoffMs = [0, timeouts.TWO_SEC, timeouts.FIVE_SEC, timeouts.TEN_SEC, timeouts.TEN_SEC];

    // Sync MUST be disabled before tapReturnKey — search keeps the dispatch queue busy.
    await device.disableSynchronization();
    try {
        /* eslint-disable no-await-in-loop -- search-index lag needs sequential re-submit with backoff */
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (attempt > 0) {
                await wait(backoffMs[attempt] ?? timeouts.TEN_SEC);
                await SearchMessagesScreen.searchInput.replaceText(searchableMessage);
            }
            await SearchMessagesScreen.searchInput.tapReturnKey();
            try {
                const searchTimeout = attempt === 0 ? timeouts.TWENTY_SEC : timeouts.ONE_MIN;
                await waitForElementToExist(searchResultElement, searchTimeout);
                break;
            } catch {
                if (attempt === maxAttempts - 1) {
                    throw new Error(`Search result for post ${postId} not found after ${maxAttempts} attempts`);
                }
            }
        }
        /* eslint-enable no-await-in-loop */
    } finally {
        await safeEnableSynchronization();
    }

    await searchResultElement.tap();
    await PermalinkScreen.toBeVisible();
    await PermalinkScreen.jumpToRecentMessages();

    await device.disableSynchronization();
    try {
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
        if (isAndroid()) {
            await waitForElementToExist(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
        } else {
            await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
        }
    } finally {
        await safeEnableSynchronization();
    }
}

// Open an archived channel using the platform-appropriate navigation path.
//   Android: Browse Channels → archived filter → tap channel.
//   iOS:     search → permalink → jumpToRecentMessages.
export async function openArchivedChannel(
    channelName: string,
    searchableMessage: string,
    postId: string,
) {
    if (isAndroid()) {
        try {
            await openArchivedChannelViaBrowseChannels(channelName);
        } catch {
            // Archived filter list can lag behind WebSocket events — fall back to search/permalink.
            await openArchivedChannelViaSearchPermalink(searchableMessage, postId);
        }
    } else {
        await openArchivedChannelViaSearchPermalink(searchableMessage, postId);
    }
}

// Close the archived channel and return to the channel list.
//   Android (Browse Channels path): back → dismiss Browse Channels modal.
//   iOS (search/permalink path):    back → channel list (no modal).
export async function closeArchivedChannel() {
    await ChannelScreen.back();
    await wait(timeouts.ONE_SEC);

    if (isAndroid()) {
        // After Browse Channels path, the modal is still open beneath channel.screen.
        try {
            await waitFor(BrowseChannelsScreen.closeButton).toExist().withTimeout(timeouts.FOUR_SEC);
        } catch {
            // Browse Channels already dismissed.
            return;
        }
        await BrowseChannelsScreen.closeButton.tap();
        await waitFor(BrowseChannelsScreen.closeButton).not.toExist().withTimeout(timeouts.TEN_SEC);
    }
}
