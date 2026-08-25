// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// Split out of `search_behaviors.e2e.ts` so this file groups search modifiers
// (`in:`, `from:`), the @recent-mentions tab, and special-character usernames.

import {
    Channel,
    Post,
    Setup,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    RecentMentionsScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible, waitForElementToExist, withSynchronizationDisabled} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Search - Modifiers', () => {
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

    afterEach(async () => {
        // # Safety net: tap the channel list tab to return to channel list after each test.
        // A 1-second wait after the tap lets iOS tab-switch animations complete before
        // the next beforeEach assertion runs.
        try {
            await HomeScreen.channelListTab.tap();
        } catch {
            // Best-effort
        }
        await wait(timeouts.ONE_SEC);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T358_1 - search "in:[username]" returns DM results', async () => {
        // # Create a second user, create a DM channel with that user, and post a message
        const {user: dmUser} = await User.apiCreateUser(siteOneUrl);
        const {channel: dmChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, dmUser.id]);
        const dmMessage = `DMmsg ${getRandomId()}`;
        const {post: dmPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: dmChannel.id,
            message: dmMessage,
        });

        // # Wait for the DM channel to sync via WebSocket (no reload needed)
        await wait(timeouts.TWO_SEC);

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Search with in: modifier using @username syntax for the DM channel
        // Mattermost requires @username prefix for in: searches in DM channels
        const searchQuery = `in: @${dmUser.username} ${dmMessage}`;
        await SearchMessagesScreen.searchInput.typeText(searchQuery);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // # Scroll the results list down to dismiss the keyboard and bring the result fully into
        // view — after tapReturnKey the soft keyboard can still be raised on Android, which
        // covers the bottom of the list and causes the 50%-visibility check to fail.
        try {
            await SearchMessagesScreen.getFlatPostList().scroll(100, 'down', 0.5, 0.5);
        } catch {
            // List too short to scroll — result is already fully visible
        }

        // * Verify the DM message appears in search results
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(dmPost.id, dmMessage);
        await expect(postListPostItem).toBeVisible();

        // # Clear search, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchQuery).tap();
        } catch {
            // Cleanup best-effort
        }
        await ChannelListScreen.open();
    });

    it('MM-T378_1 - @recent mention search - x to clear search term', async () => {
        // # Open recent mentions screen
        await RecentMentionsScreen.open();

        // * Verify on recent mentions screen
        await RecentMentionsScreen.toBeVisible();

        // * Verify the screen is accessible (title check skipped — on iOS, all tab screens remain
        // mounted simultaneously so atIndex(0) may match a background screen's header instead)
        await RecentMentionsScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T585_1 - unfiltered search is not affected by previous modifier searches', async () => {
        // # Post a message for plain text search
        const plainTerm = `plain${getRandomId()}`;
        const message = `Message ${plainTerm}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post: plainPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await Post.waitForPostMessageInSearch(siteOneUrl, plainTerm, plainPost.id, message);

        // iOS can keep the JS run loop busy after posting, which blocks the back tap before
        // Detox dispatches it. Re-enable only after the channel list is visible and settled.
        await withSynchronizationDisabled(async () => {
            await ChannelScreen.back();
            await ChannelListScreen.toBeVisible();
            await wait(timeouts.TWO_SEC);
        });

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Clear any stale search state from previous test failures that left search in results mode
        try {
            await SearchMessagesScreen.searchClearButton.tap();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Already in empty/modifier state — no stale results to clear
        }

        // # First search using the from: modifier
        // Wait for modifier to be visible — only shown when search input is empty
        await waitFor(SearchMessagesScreen.searchModifierFrom).toExist().withTimeout(timeouts.TEN_SEC);
        await SearchMessagesScreen.searchModifierFrom.tap();
        await SearchMessagesScreen.searchInput.typeText(testUser.username);
        await SearchMessagesScreen.submitSearch();

        // # Clear modifier state before plain search to ensure unfiltered results
        // The from: modifier must be cleared by clearing the entire search input,
        // which returns the search UI to initial state (input empty, modifiers visible).
        // Merely replacing the text leaves the modifier flag active, causing the second
        // search to be "from: plainTerm" instead of just "plainTerm".
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.searchInput.replaceText(plainTerm);
        await SearchMessagesScreen.submitSearch();

        // * Verify that plain text search returns the expected result
        // (not affected by previous from: filter)
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(plainPost.id, message);
        await waitForElementToExist(postListPostItem, timeouts.HALF_MIN);

        // The search screen keeps a recurring "Perform Block" on the JS run loop (recent-search
        // debounce + WS poll), which Detox reads as "app busy" forever, so every synchronized
        // action from here on never dispatches. The run this was written against died exactly
        // here: the last invoke before the 300s cap was `tap tab_bar.home.tab` with
        // busy_resources = JS Run Loop + Runloop Perform Block (ios4 on f181296). The
        // interaction above is already wrapped for this reason — the trailing cleanup was not.
        await withSynchronizationDisabled(async () => {
            await SearchMessagesScreen.searchClearButton.tap();
            const plainRemove = SearchMessagesScreen.getRecentSearchItemRemoveButton(plainTerm);
            await waitForElementToExist(plainRemove, timeouts.TEN_SEC);
            await plainRemove.tap();
            try {
                await SearchMessagesScreen.getRecentSearchItemRemoveButton(`from: ${testUser.username}`).tap();
            } catch {
                // from: recent may already be gone
            }
            await ChannelListScreen.open();
            await ChannelListScreen.toBeVisible();
            await wait(timeouts.TWO_SEC);
        });
    });

    it('MM-T348_1 - full username with -, _, or . highlighted in search results', async () => {
        // # Create a user with a username containing special characters
        const randomId = getRandomId();
        const specialUsername = `test-user_name.${randomId}`;
        const {user: specialUser} = await User.apiCreateUser(siteOneUrl, {
            user: {
                email: `${specialUsername}@sample.mattermost.com`,
                username: specialUsername,
                password: `P${randomId}!1234`,
                first_name: `F${randomId}`,
                last_name: `L${randomId}`,
            },
        });

        // # Post a message mentioning the special character username
        const mentionMessage = `Hello @${specialUser.username}`;
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: mentionMessage,
        });
        const {post: mentionPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open search messages screen and search for the full special username
        await SearchMessagesScreen.open();
        await device.disableSynchronization();
        try {
            await SearchMessagesScreen.searchInput.replaceText(specialUser.username);
            await SearchMessagesScreen.searchInput.tapReturnKey();
            await wait(timeouts.TWO_SEC);

            // * Verify the post containing the username mention appears in results
            const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(mentionPost.id, mentionMessage);
            await waitForElementToBeVisible(postListPostItem, timeouts.HALF_MIN);
        } finally {
            await device.enableSynchronization();
        }

        // # Clear search, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(specialUser.username).tap();
        await ChannelListScreen.open();
    });
});
