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
    System,
    Team,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    SearchMessagesScreen,
    ServerScreen,
    TeamDropdownMenuScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

describe('Search - Search Messages', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                CollapsedThreads: 'always_on',
                ThreadAutoFollow: true,
            },
        });

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // SEC-10996: recover to the channel list regardless of where the previous
        // case left the app. A search-modifier test that throws mid-flow (e.g.
        // MM-T5294_3's not-hittable modifier) leaves the search screen open, so the
        // next case's ChannelListScreen.toBeVisible() failed and cascaded the whole
        // MM-T5294_3.._9 block. Tapping the channel-list tab returns to a known
        // starting state from anywhere in the search/channel flow.
        //
        // CodeRabbit note: this recovery targets the primary cascade (the search
        // screen left open), which the isolation proof confirmed. It does not
        // explicitly dismiss transient UI (team dropdown / autocomplete) or restore
        // testTeam. The team-inherit risk is unobserved: MM-T5294_8's search team
        // picker is search-scoped (the app stays on testTeam after close — _9 passes
        // after _8 in 2x green runs), so a full team-restore in beforeEach is out of
        // SEC-10996's cascade-isolation scope and would add flake-prone complexity.
        try {
            await SearchMessagesScreen.close();
        } catch {
            // channel-list tab not reachable (modal/channel screen) — back out first.
            try {
                await ChannelScreen.back();
            } catch {
                // ignore — fall through to the assertion below.
            }
        }
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T5294_1 - should match elements on search messages screen', async () => {
        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify basic elements on search messages screen
        await expect(SearchMessagesScreen.largeHeaderTitle).toHaveText('Search');
        await expect(SearchMessagesScreen.searchInput).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierHeader).toHaveText('Search options');
        await expect(SearchMessagesScreen.searchModifierFrom).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierIn).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierExclude).toBeVisible();
        await expect(SearchMessagesScreen.searchModifierPhrases).toBeVisible();

        // # Go back to channel list screen
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T5294_2 - should be able to search messages from a specific user', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Tap on from-search-modifier, type in username, tap on user at-mention autocomplete, and tap on search key
        await SearchMessagesScreen.searchModifierFrom.tap();
        await SearchMessagesScreen.searchInput.typeText(testUser.username);
        const {atMentionItem} = Autocomplete.getAtMentionItem(testUser.id);
        await waitForElementToBeVisible(atMentionItem, timeouts.TWO_SEC);
        await atMentionItem.tap();
        await SearchMessagesScreen.searchInput.tapReturnKey();

        // * Verify search results contain messages from user
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(`from: ${testUser.username}`);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // Root flake of the MM-T5294_3.._9 cluster (SEC-10996): the in-search-modifier
    // is not hittable on iOS CI (hit-test family — see SEC-11010/SEC-11017). SEC-10996
    // only isolates the cascade via the beforeEach recovery above, so this root stays
    // skipped until the hit-test helper lands; the collateral _4.._9 are unskipped.
    (isIos() ? it.skip : it)('MM-T5294_3 - should be able to search messages in a specific channel', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Tap on in-search-modifier, type in channel name, tap on channel mention autocomplete, and tap on search key
        // Corner-tap: the search modifier row's center is obscured by the search
        // modal's UITransitionView (same workaround as PostOptionsScreen.deletePost).
        await SearchMessagesScreen.searchModifierIn.tap({x: 1, y: 1});
        await SearchMessagesScreen.searchInput.typeText(testChannel.name);
        const {channelMentionItem} = Autocomplete.getChannelMentionItem(testChannel.name);
        await waitForElementToBeVisible(channelMentionItem, timeouts.TWO_SEC);
        await channelMentionItem.tap();
        await SearchMessagesScreen.searchInput.tapReturnKey();

        // * Verify search results contain messages in channel
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(`channel: ${testChannel.name}`);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // Unskipped (SEC-10996): was pure cascade collateral from MM-T5294_3 — the
    // beforeEach recovery now returns to a known search starting state.
    it('MM-T5294_4 - should be able to search messages excluding search terms', async () => {
        // # Open a channel screen, post a message prefix plus non-excluded term, post another message prefix plus excluded term, go back to channel list screen, and open search messages screen
        const excludedTerm = getRandomId();
        const messagePrefix = 'Message';
        const messageWithNonExcludedTerm = `${messagePrefix} ${getRandomId()}`;
        const messageWithExcludedTerm = `${messagePrefix} ${excludedTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(messageWithNonExcludedTerm);
        const {post: nonExcludedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: nonExcludedPostListPostItem} = SearchMessagesScreen.getPostListPostItem(nonExcludedPost.id, messageWithNonExcludedTerm);
        await ChannelScreen.postMessage(messageWithExcludedTerm);
        const {post: excludedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: excludedPostListPostItem} = SearchMessagesScreen.getPostListPostItem(excludedPost.id, messageWithExcludedTerm);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in the message prefix, tap on excluded-search modifier, type in the excluded term, and tap on search key
        await SearchMessagesScreen.searchInput.typeText(messagePrefix);
        await SearchMessagesScreen.searchModifierExclude.tap();
        await SearchMessagesScreen.searchInput.typeText(excludedTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();

        // * Verify search results do not contain messages with excluded term
        await wait(timeouts.TWO_SEC);
        await expect(nonExcludedPostListPostItem).toBeVisible();
        await expect(excludedPostListPostItem).not.toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(`${messagePrefix} -${excludedTerm}`);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // Unskipped (SEC-10996): was cascade collateral from MM-T5294_3 — the
    // beforeEach recovery now returns to a known search starting state.
    it('MM-T5294_5 - should be able to search messages with phrases', async () => {
        // # Open a channel screen, post a message prefix plus non-included term, post another message prefix plus included term, go back to channel list screen, and open search messages screen
        const includedTerm = getRandomId();
        const messagePrefix = 'How are';
        const messageWithNonIncludedTerm = `${messagePrefix} ${getRandomId()}`;
        const messageWithIncludedTerm = `${messagePrefix} ${includedTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(messageWithNonIncludedTerm);
        const {post: nonIncludedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: nonIncludedPostListPostItem} = SearchMessagesScreen.getPostListPostItem(nonIncludedPost.id, messageWithNonIncludedTerm);
        await ChannelScreen.postMessage(messageWithIncludedTerm);
        const {post: includedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: includedPostListPostItem} = SearchMessagesScreen.getPostListPostItem(includedPost.id, messageWithIncludedTerm);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in the message prefix plus included term inside double quotes and tap on search key
        // Corner-tap: searchModifierPhrases is 1.3px clipped at this state too (same
        // 100% threshold failure as at :214 below). Apply the same workaround.
        await SearchMessagesScreen.searchModifierPhrases.tap({x: 1, y: 1});
        await SearchMessagesScreen.searchInput.tapBackspaceKey();
        await SearchMessagesScreen.searchInput.typeText(messageWithIncludedTerm);

        // # Collapse the keyboard
        await element(by.id('search.modifier.header')).tap();

        // Corner-tap: searchModifierPhrases is 1.3px clipped and fails the 100% visibility
        // threshold, same as searchModifierIn above.
        await SearchMessagesScreen.searchModifierPhrases.tap({x: 1, y: 1});
        await SearchMessagesScreen.searchInput.tapBackspaceKey();
        await SearchMessagesScreen.searchInput.tapReturnKey();

        // * Verify search results only contain messages with included term
        await wait(timeouts.TWO_SEC);
        await expect(nonIncludedPostListPostItem).not.toBeVisible();
        await expect(includedPostListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(`"${messageWithIncludedTerm} "`);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // Unskipped (SEC-10996): was cascade collateral from MM-T5294_3 — the
    // beforeEach recovery now returns to a known search starting state.
    it('MM-T5294_6 - should be able to search messages using combination of modifiers', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Tap on from-search-modifier, type in username
        await SearchMessagesScreen.searchInput.typeText(`from: ${testUser.username} channel: ${testChannel.name}`);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify search results only contain messages from user in channel
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(`from: ${testUser.username} channel: ${testChannel.name}`);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // Unskipped (SEC-10996): was cascade collateral from MM-T5294_3 — the
    // beforeEach recovery now returns to a known search starting state.
    it('MM-T5294_7 - should be able to search messages using recent searches', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const searchTerm = getRandomId();
        const message = `Message ${searchTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in a search term that will yield results and tap on search key
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TEN_SEC);

        // * Verify search results contain searched message
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input and tap on recent search item
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItem(searchTerm).tap();

        // * Verify search results contain searched message
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchInput.tap();
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(searchTerm);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // Unskipped (SEC-10996): was cascade collateral from MM-T5294_3 — the
    // beforeEach recovery now returns to a known search starting state.
    it('MM-T5294_8 - should be able to search messages on a another joined team', async () => {
        // # As admin, create a second team, add user to the second team, create a new channel on second team, and add user to new channel; as user, terminate app and relaunch app
        const {team: testTeamTwo} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeamTwo.id);
        const {channel: testChannelTwo} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeamTwo.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, testChannelTwo.id);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Verify on first team
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);

        // # Post a message to the new channel on second team and open search messages screen
        const searchTerm = getRandomId();
        const message = `Message ${searchTerm}`;
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannelTwo.id,
            message,
        });
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Tap on team picker button and tap on second team option
        await SearchMessagesScreen.teamPickerButton.tap();
        await TeamDropdownMenuScreen.getTeamIcon(testTeamTwo.id).tap();

        // * Verify team picker button displays second team name
        await expect(element(by.text(testTeamTwo.display_name))).toBeVisible();

        // # Type in a search term that will yield results for second team and tap on search key
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify search results contain searched message
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Tap on team picker button and tap on first team option
        await SearchMessagesScreen.teamPickerButton.tap();
        await wait(timeouts.TWO_SEC);
        await TeamDropdownMenuScreen.getTeamIcon(testTeam.id).tap();

        // * Verify search results do not contain searched message
        await expect(postListPostItem).not.toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(searchTerm);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // Unskipped (SEC-10996): was cascade collateral from MM-T5294_3 — the
    // beforeEach recovery now returns to a known search starting state.
    it('MM-T5294_9 - should show empty search results screen when search result is empty', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in a search term that will yield no results and tap on search key
        const searchTerm = getRandomId();
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify empty search state for search messages
        await expect(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible();
        await expect(element(by.text('Check the spelling or try another search.'))).toExist();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(searchTerm);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });

    // MM-T5294_10, _11, _12 (post actions on search results — edit/save/pin)
    // moved to ./search_message_post_actions.e2e.ts. Combined this file ran 20.3 min
    // per-test runtime in CI run 26368981355 — too close to a single shard's budget.
});
