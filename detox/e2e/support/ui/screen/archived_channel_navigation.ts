// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Shared helpers for opening an archived channel in tests.
//
// Platform split:
//   Android — Browse Channels → archived filter → tap channel (baseline flow;
//             search/permalink regressed MM-T1671_1 + MM-T1722_1).
//   iOS     — search → permalink → jumpToRecentMessages, with Browse Channels
//             as fallback when the archived draft never mounts.

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
    waitForElementToExist,
} from '@support/utils';
import {waitFor} from 'detox';

// Open Browse Channels and select the Archived filter.
// Exported because some tests still need to verify Browse-Channels-specific
// UI state (e.g. archived dropdown text) independent of channel navigation.
export async function openArchivedChannelsFilter() {
    await ChannelDropdownMenuScreen.open();
    await wait(timeouts.ONE_SEC);

    // Keep Detox sync enabled for this tap; disabling it races Fabric view insertion.
    await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
    await wait(timeouts.TWO_SEC);
}

// Post a searchable sentinel so openArchivedChannelViaSearchPermalink() can find the channel.
// Must run before the channel is archived — the server rejects posts on archived channels.
export async function postArchivedChannelSentinel(channelId: string): Promise<{sentinel: string; postId: string}> {
    const sentinel = `archived-channel-sentinel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const {post, error} = await Post.apiCreatePost(siteOneUrl, {channelId, message: sentinel});
    if (error || !post?.id) {
        throw new Error(`Failed to create archived-channel sentinel: ${JSON.stringify(error ?? 'missing post id')}`);
    }
    return {sentinel, postId: post.id};
}

// Scroll the archived list until the channel row exists. The Browse Channels search input
// never lands in the Android view hierarchy, so filtering by name is not an option here.
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

async function waitForArchivedChannelDestination() {
    await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
    // Existence, not 75% visibility: the archived footer sits in the home-indicator
    // inset and local deleteAt can land after the channel screen itself.
    await waitForElementToExist(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
}

async function openArchivedChannelViaBrowseChannels(channelName: string) {
    await BrowseChannelsScreen.open();
    await BrowseChannelsScreen.dismissScheduledPostTooltip();
    await openArchivedChannelsFilter();

    const channelItem = await waitForArchivedChannelItem(channelName);
    const channelItemDisplayName = BrowseChannelsScreen.getChannelItemDisplayName(channelName);

    // Prefer the display-name text (hittable) over the row container; fall back to the row.
    try {
        await waitFor(channelItemDisplayName).toBeVisible(40).withTimeout(timeouts.TEN_SEC);
        await channelItemDisplayName.tap();
    } catch {
        await waitFor(channelItem).toExist().withTimeout(timeouts.TEN_SEC);
        await channelItem.tap();
    }

    // Explicit destination asserts — callers must not treat a tap alone as success.
    await waitForArchivedChannelDestination();
}

// iOS-only: the Browse Channels tap does not reliably navigate on iOS, so go via a permalink.
// Locate the result by postId — the search renderer splits the message across several Text nodes.
async function openArchivedChannelViaSearchPermalink(searchableMessage: string, postId: string) {
    await SearchMessagesScreen.open();
    await SearchMessagesScreen.searchInput.replaceText(searchableMessage);

    // Pass '' so getPostItemMatcher returns a pure by.id() matcher on the post container.
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
        await waitForArchivedChannelDestination();
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
        } catch (error) {
            // Only fall back after the browse destination assert failed — do not mask it silently.
            // eslint-disable-next-line no-console
            console.warn(
                `[openArchivedChannel] Browse path failed for "${channelName}"; falling back to search/permalink. ` +
                `${error instanceof Error ? error.message : String(error)}`,
            );
            await openArchivedChannelViaSearchPermalink(searchableMessage, postId);
        }
    } else {
        try {
            await openArchivedChannelViaSearchPermalink(searchableMessage, postId);
        } catch (error) {
            // Permalink can land on the channel before local deleteAt is set, so the
            // archived draft never mounts. Recover via Browse Channels.
            // eslint-disable-next-line no-console
            console.warn(
                `[openArchivedChannel] Search/permalink path failed for "${channelName}"; falling back to Browse Channels. ` +
                `${error instanceof Error ? error.message : String(error)}`,
            );
            try {
                await SearchMessagesScreen.close();
            } catch {
                // Already off search.
            }
            await openArchivedChannelViaBrowseChannels(channelName);
        }
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
