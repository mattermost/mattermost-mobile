// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Shared helpers for opening an archived channel in tests.
//
// Both platforms use search → permalink → jumpToRecentMessages.
// Android Browse Channels → archived filter crashes RN Fabric on CI
// ("addViewAt: child already has a parent" — MM-T1716 testFnFailure.png).

import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
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

// Navigate to an archived channel via the search results permalink flow.
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
        /* eslint-disable no-await-in-loop -- search-index lag may need multiple submits */
        for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) {
                await SearchMessagesScreen.searchInput.clearText();
                await wait(timeouts.TWO_SEC);
                await SearchMessagesScreen.searchInput.replaceText(searchableMessage);
            }
            await SearchMessagesScreen.searchInput.tapReturnKey();
            try {
                await waitForElementToExist(searchResultText, timeouts.TWENTY_SEC);
                break;
            } catch (error) {
                if (attempt === 2) {
                    throw error;
                }
            }
        }
        /* eslint-enable no-await-in-loop */
    } finally {
        await device.enableSynchronization();
    }

    await searchResultText.tap();
    await PermalinkScreen.toBeVisible();
    await PermalinkScreen.jumpToRecentMessages();

    await device.disableSynchronization();
    try {
        await waitForElementToExist(ChannelScreen.channelScreen, timeouts.ONE_MIN);
        await waitForElementToExist(ChannelScreen.postDraftArchived, timeouts.HALF_MIN);
    } finally {
        await device.enableSynchronization();
    }
}

// Open an archived channel via search → permalink → jumpToRecentMessages.
// Android Browse Channels → archived filter regressed with RN Fabric
// ("addViewAt: child already has a parent" — see MM-T1716 testFnFailure.png).
export async function openArchivedChannel(
    _channelName: string,
    searchableMessage: string,
) {
    await openArchivedChannelViaSearchPermalink(searchableMessage);
}

// Close the archived channel and return to the channel list.
export async function closeArchivedChannel() {
    await ChannelScreen.back();
    await wait(timeouts.ONE_SEC);
}
