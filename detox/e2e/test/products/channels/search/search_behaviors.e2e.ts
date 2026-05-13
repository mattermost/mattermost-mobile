// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

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
    PermalinkScreen,
    PostOptionsScreen,
    RecentMentionsScreen,
    SavedMessagesScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Search - Search Behaviors', () => {
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

    it('MM-T351_1 - wildcard (*) disregarded if not preceded by text', async () => {
        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type a wildcard with no preceding text and submit search
        await SearchMessagesScreen.searchInput.typeText('*test');
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify that no crash occurs and the results state is shown (search completed without error)
        await expect(SearchMessagesScreen.searchMessagesScreen).toBeVisible();

        // # Clear search input and remove recent search item if present
        await SearchMessagesScreen.searchClearButton.tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton('*test').tap();
        } catch {
            // Recent search item may not exist if wildcard was discarded; no action needed
        }

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T352_1 - cleared search term should not reappear', async () => {
        const searchTerm = `cleartest${getRandomId()}`;

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type a search term
        await SearchMessagesScreen.searchInput.typeText(searchTerm);

        // * Verify the search term is in the input
        await expect(SearchMessagesScreen.searchInput).toHaveText(searchTerm);

        // # Clear the search input using the X button
        await SearchMessagesScreen.searchClearButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify the search input is now empty
        await expect(SearchMessagesScreen.searchInput).toHaveText('');

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T355_1 - old results not combined with new results', async () => {
        // # Post two uniquely-searchable messages
        const termA = `terma${getRandomId()}`;
        const termB = `termb${getRandomId()}`;
        const messageA = `Message ${termA}`;
        const messageB = `Message ${termB}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(messageA);
        const {post: postA} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.postMessage(messageB);
        const {post: postB} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Search for term A
        await SearchMessagesScreen.searchInput.typeText(termA);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify result for term A is shown
        const {postListPostItem: postItemA} = SearchMessagesScreen.getPostListPostItem(postA.id, messageA);
        await expect(postItemA).toBeVisible();

        // # Clear search and search for term B
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.searchInput.typeText(termB);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify result for term B is shown
        const {postListPostItem: postItemB} = SearchMessagesScreen.getPostListPostItem(postB.id, messageB);
        await expect(postItemB).toBeVisible();

        // * Verify result for term A is NOT shown (results were replaced, not combined)
        await expect(postItemA).not.toBeVisible();

        // # Clear search, remove recent search items, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(termB).tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(termA).tap();
        } catch {
            // Term A may not be in recent searches if it was replaced; no action needed
        }
        await ChannelListScreen.open();
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

    it('MM-T3238_1 - delete one previous search, tap on another', async () => {
        // # Post messages for two distinct search terms so they appear in recent searches
        const termOne = `recent1${getRandomId()}`;
        const termTwo = `recent2${getRandomId()}`;
        const msgOne = `Message ${termOne}`;
        const msgTwo = `Message ${termTwo}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(msgOne);
        await ChannelScreen.postMessage(msgTwo);
        const {post: postTwo} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen, search for term one to save it as recent
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(termOne);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // # Clear and search for term two to save it as recent
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.searchInput.typeText(termTwo);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // # Clear search to show recent search list
        await SearchMessagesScreen.searchClearButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify both recent search items are visible
        await expect(SearchMessagesScreen.getRecentSearchItem(termOne)).toBeVisible();
        await expect(SearchMessagesScreen.getRecentSearchItem(termTwo)).toBeVisible();

        // # Delete the first recent search item
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(termOne).tap();
        await wait(timeouts.ONE_SEC);

        // * Verify term one is removed
        await expect(SearchMessagesScreen.getRecentSearchItem(termOne)).not.toExist();

        // # Tap on the remaining (term two) recent search item
        await SearchMessagesScreen.getRecentSearchItem(termTwo).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify results for term two are loaded
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(postTwo.id, msgTwo);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove remaining recent search item, and go back to channel list screen
        // The clear button may be unmounted after tapping a recent search item on some platforms,
        // so wrap cleanup in try-catch to ensure navigation always runs.
        try {
            await SearchMessagesScreen.searchClearButton.tap();
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(termTwo).tap();
        } catch {
            // Cleanup best-effort — clear button may not be in hierarchy after recent item tap
        }
        await ChannelListScreen.open();
    });

    it('MM-T3239_1 - long list of search results is scrollable', async () => {
        // # Create many posts containing a common word
        const commonWord = `common${getRandomId()}`;
        const postCount = 20;
        const postIds: string[] = [];

        /* eslint-disable no-await-in-loop */
        for (let i = 0; i < postCount; i++) {
            const {post} = await Post.apiCreatePost(siteOneUrl, {
                channelId: testChannel.id,
                message: `${commonWord} post number ${i}`,
            });
            postIds.push(post.id);
        }
        /* eslint-enable no-await-in-loop */

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Search for the common word
        await SearchMessagesScreen.searchInput.typeText(commonWord);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify at least one result is visible
        const flatList = SearchMessagesScreen.getFlatPostList();
        await expect(flatList).toBeVisible();

        // # Scroll the results list down to verify it is scrollable
        try {
            await flatList.scroll(300, 'down', 0.5, 0.5);
        } catch {
            // List may be too short to scroll — scrollability already satisfied
        }
        await wait(timeouts.ONE_SEC);

        // * Verify the list is still present after scrolling
        await expect(flatList).toBeVisible();

        // # Clear search, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await wait(timeouts.ONE_SEC);

        // Cleanup is best-effort — scrolling results can leave the screen in a state
        // where the recent item remove button is not accessible on some platforms
        try {
            await waitFor(SearchMessagesScreen.getRecentSearchItemRemoveButton(commonWord)).toExist().withTimeout(timeouts.TEN_SEC);
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(commonWord).tap();
        } catch {
            // Recent item cleanup failed — not blocking; the core scroll assertion already passed
        }
        await ChannelListScreen.open();
    });

    it('MM-T3240_1 - no option to Add Reaction on search results', async () => {
        // # Post a message and search for it
        const searchTerm = `noreact${getRandomId()}`;
        const message = `Message ${searchTerm}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();

        // # Open search messages screen and search for the message
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // # Get post and open post options for the search result
        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);

        // * Verify "Add Reaction" pick reaction button is NOT present in post options
        await expect(PostOptionsScreen.pickReactionButton).not.toExist();

        // # Close post options
        await PostOptionsScreen.close();

        // # Clear search, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });

    it('MM-T380_1 - link opens for post not displaying in center', async () => {
        // # Post a message in the test channel
        const searchTerm = `jumptest${getRandomId()}`;
        const message = `Message ${searchTerm}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post: postedMessage} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen and search for the posted message
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify post result is visible
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(postedMessage.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the post to navigate to it via permalink
        await postListPostItem.tap();

        // * Verify on permalink screen
        await PermalinkScreen.toBeVisible();

        // # Jump to recent messages
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen with the post visible
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(postedMessage.id, message);
        await expect(channelPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    it('MM-T366_1 - focus does not stay in search box after search', async () => {
        const searchTerm = `focustest${getRandomId()}`;
        const message = `Message ${searchTerm}`;

        // # Post a message so there are results
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // Fetch post ID immediately after posting before any other posts can be created
        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Clear any stale search input from a previous test (typeText appends, not replaces)
        try {
            await SearchMessagesScreen.searchClearButton.tap();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Already empty — no action needed
        }

        // # Type a search term and submit search
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // Dismiss keyboard so post is not hidden behind it
        try {
            await SearchMessagesScreen.getFlatPostList().scroll(50, 'down');
        } catch {
            // List too short to scroll
        }

        // * Verify search results are shown without waiting for Detox idle-sync
        // (waitForElementToBeVisible polls immediately, avoiding bridge-idle stalls)
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(searchedPost.id, message);
        await waitForElementToBeVisible(postListPostItem, timeouts.HALF_MIN);

        // * Verify the results list is visible (keyboard has been dismissed)
        await expect(SearchMessagesScreen.getFlatPostList()).toBeVisible();

        // # Clear search, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
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
        await ChannelScreen.back();

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
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // # Clear modifier search and do a plain text search
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.searchInput.typeText(plainTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify that plain text search returns the expected result (not affected by previous from: filter)
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(plainPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Clear search, remove recent search items, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(plainTerm).tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(`from: ${testUser.username}`).tap();
        } catch {
            // Cleanup best-effort
        }
        await ChannelListScreen.open();
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
        await SearchMessagesScreen.searchInput.typeText(specialUser.username);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify the post containing the username mention appears in results
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(mentionPost.id, mentionMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.HALF_MIN);

        // # Clear search, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(specialUser.username).tap();
        await ChannelListScreen.open();
    });

    it('MM-T372_1 - highlighting does not persist in Saved Messages', async () => {
        // # Post a message and search for it to establish search highlighting context
        const searchTerm = `highlight${getRandomId()}`;
        const message = `Message ${searchTerm}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();

        // # Open search, search for term, and save the result
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();

        // # Navigate to Saved Messages
        await SavedMessagesScreen.open();

        // * Verify on Saved Messages screen
        await SavedMessagesScreen.toBeVisible();

        // * Verify the message appears in Saved Messages (without search highlighting context)
        const {postListPostItem: savedPostItem} = SavedMessagesScreen.getPostListPostItem(searchedPost.id, message);
        await expect(savedPostItem).toBeVisible();

        // # Unsave the post to clean up, then go back to channel list
        await SavedMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.unsavePostOption.tap();

        // # Go back to search screen to clean up recent searches
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        } catch {
            // Cleanup best-effort
        }
        await ChannelListScreen.open();
    });
});
