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

// Open Browse Channels and select the Archived filter.
// Exported because some tests still need to verify Browse-Channels-specific
// UI state (e.g. archived dropdown text) independent of channel navigation.
export async function openArchivedChannelsFilter() {
    await ChannelDropdownMenuScreen.open();

    if (isAndroid()) {
        await wait(timeouts.ONE_SEC);
        await device.disableSynchronization();
    }
    try {
        await ChannelDropdownMenuScreen.archivedChannelsItem.tap();
    } finally {
        if (isAndroid()) {
            await safeEnableSynchronization();
        }
    }
    await wait(timeouts.ONE_SEC);
}

// Ensure the archived channel has a searchable sentinel post so the
// search/permalink fallback path can find it. Posts must be created BEFORE
// the channel is archived (server rejects posts on archived channels).
//
// Returns the unique sentinel message that was posted, which the caller
// can hand to openArchivedChannelViaSearchPermalink().
export async function postArchivedChannelSentinel(channelId: string): Promise<string> {
    const sentinel = `archived-channel-sentinel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await Post.apiCreatePost(siteOneUrl, {channelId, message: sentinel});
    return sentinel;
}

// Navigate to an archived channel via Browse Channels → archived filter → tap.
// Android-only: the search/permalink path regressed MM-T1671_1 + MM-T1722_1.
//
// searchInput.replaceText is attempted to narrow results, but silently skipped
// when the element is not findable in the Android view hierarchy (observed on
// some API-35 shard configs). The archived-filter pre-loads recently-archived
// channels at the top of the list, so the channel item is still found either way.
async function openArchivedChannelViaBrowseChannels(channelName: string) {
    await BrowseChannelsScreen.open();
    await BrowseChannelsScreen.dismissScheduledPostTooltip();
    await openArchivedChannelsFilter();

    try {
        await BrowseChannelsScreen.searchInput.replaceText(channelName);
    } catch {
        // searchInput not in view hierarchy on this config — fall through.
    }

    await waitFor(BrowseChannelsScreen.getChannelItem(channelName)).toExist().withTimeout(timeouts.TEN_SEC);
    await BrowseChannelsScreen.getChannelItem(channelName).tap();

    await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
    await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
}

// Navigate to an archived channel via the search results permalink flow.
// iOS-only: Browse Channels tap does not reliably navigate on iOS in CI.
async function openArchivedChannelViaSearchPermalink(searchableMessage: string) {
    await SearchMessagesScreen.open();
    await SearchMessagesScreen.searchInput.replaceText(searchableMessage);

    const searchResultText = element(
        by.
            text(searchableMessage).
            withAncestor(by.id(SearchMessagesScreen.postList.testID.flatList)),
    );

    // Sync MUST be disabled before tapReturnKey — search keeps the dispatch queue busy.
    await device.disableSynchronization();
    try {
        await SearchMessagesScreen.searchInput.tapReturnKey();
        try {
            await waitForElementToBeVisible(searchResultText, timeouts.TWENTY_SEC);
        } catch {
            // Search-index lag: up to three total attempts (two re-submits after the initial try).
            await SearchMessagesScreen.searchInput.tapReturnKey();
            try {
                await waitForElementToBeVisible(searchResultText, timeouts.ONE_MIN);
            } catch {
                await SearchMessagesScreen.searchInput.tapReturnKey();
                await waitForElementToBeVisible(searchResultText, timeouts.ONE_MIN);
            }
        }
    } finally {
        await device.enableSynchronization();
    }

    await searchResultText.tap();
    await PermalinkScreen.toBeVisible();
    await PermalinkScreen.jumpToRecentMessages();

    await device.disableSynchronization();
    try {
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        await device.enableSynchronization();
    }
}

// Open an archived channel using the platform-appropriate navigation path.
//   Android: Browse Channels → archived filter → tap channel.
//   iOS:     search → permalink → jumpToRecentMessages.
export async function openArchivedChannel(
    channelName: string,
    searchableMessage: string,
) {
    if (isAndroid()) {
        await openArchivedChannelViaBrowseChannels(channelName);
    } else {
        await openArchivedChannelViaSearchPermalink(searchableMessage);
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
            await BrowseChannelsScreen.closeButton.tap();
        } catch {
            // Browse Channels already dismissed.
        }
    }
}
