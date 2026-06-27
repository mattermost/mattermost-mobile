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
// We skip the searchInput.replaceText step that prior implementations used:
// browse_channels.search_bar.search.input never lands in the Android view
// hierarchy as a Detox-findable view (confirmed by 0 hits across all 20 Android
// shard device.logs in CI run 28290273101). Waiting on a never-present testID
// times out regardless of whether you use toBeVisible or toExist. The archived-
// filter pre-loads recently-archived channels at the top of the list, so tapping
// directly works as long as we wait for the channel item itself to exist.
async function openArchivedChannelViaBrowseChannels(channelName: string) {
    await BrowseChannelsScreen.open();
    await BrowseChannelsScreen.dismissScheduledPostTooltip();
    await openArchivedChannelsFilter();

    await waitFor(BrowseChannelsScreen.getChannelItem(channelName)).toExist().withTimeout(timeouts.TEN_SEC);
    await BrowseChannelsScreen.getChannelItem(channelName).tap();

    await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
    await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
}

// Navigate to an archived channel via channel deep-link.
// iOS preferred path: the search/permalink flow times out on a freshly-provisioned
// PR test server because the sentinel post created pre-archival isn't indexed
// before the 20-second search wait window expires (re-submitting the same query
// does not force re-indexing). app/utils/deep_link/index.ts routes the
// /<team>/channels/<channel> URL via openURL even for archived channels the
// test user is a member of.
async function openArchivedChannelViaDeepLink(channelName: string, teamName: string) {
    await device.openURL({url: `${siteOneUrl}/${teamName}/channels/${channelName}`});

    // Deep-link navigation triggers the channel screen mount before the JS
    // bridge fully settles; disable sync briefly to avoid racing the assertion
    // against in-flight animations on iOS 26.2.
    await device.disableSynchronization();
    try {
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
        await waitForElementToBeVisible(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        await device.enableSynchronization();
    }
}

// Legacy iOS search/permalink path — retained as a fallback for callers that
// don't have a teamName available. Not the recommended path: regresses
// MM-T1671_1 on freshly-provisioned servers due to search-index lag.
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
            // Search-index lag retry. Note: this rarely helps because re-submitting
            // doesn't force re-indexing. The deep-link path above is preferred.
            await SearchMessagesScreen.searchInput.tapReturnKey();
            await waitForElementToBeVisible(searchResultText, timeouts.ONE_MIN);
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
//   Android: Browse Channels → archived filter → tap channel (no searchInput).
//   iOS:     deep-link via device.openURL — preferred. Falls back to
//            search/permalink if teamName is not provided.
export async function openArchivedChannel(
    channelName: string,
    searchableMessage: string,
    teamName?: string,
) {
    if (isAndroid()) {
        await openArchivedChannelViaBrowseChannels(channelName);
    } else if (teamName) {
        await openArchivedChannelViaDeepLink(channelName, teamName);
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
