// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Autocomplete} from '@support/ui/component';
import {
    ChannelScreen,
    PermalinkScreen,
    SearchScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';

describe('Search', () => {
    let testUser;
    let testChannel;

    const {atMentionSuggestionList} = Autocomplete;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit();
        testUser = user;

        const {channel} = await Channel.apiGetChannelByName(team.name, 'town-square');
        testChannel = channel;

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3236 search on sender, select from autocomplete, reply from search results', async () => {
        const testMessage = Date.now().toString();

        // # Post message and search on sender
        await postMessageAndSearchFrom(testMessage, testUser, atMentionSuggestionList);

        // * Verify search result post has the message
        const lastPost = await Post.apiGetLastPostInChannel(testChannel.id);
        const {
            searchResultPostItem,
            searchResultPostItemHeaderReply,
        } = await SearchScreen.getSearchResultPostItem(lastPost.post.id, testMessage);
        await expect(searchResultPostItem).toBeVisible();

        // # Open reply thread from search result post item
        const replyTestMessage = `reply-${testMessage}`;
        await searchResultPostItemHeaderReply.tap();

        // # Post a reply message
        await ThreadScreen.toBeVisible();
        await ThreadScreen.postMessage(replyTestMessage);

        // * Verify most recent post has the reply message
        const replyPost = await Post.apiGetLastPostInChannel(testChannel.id);
        const {postListPostItem} = await ThreadScreen.getPostListPostItem(replyPost.post.id, replyTestMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel
        await ThreadScreen.back();
        await SearchScreen.cancel();
    });

    it('MM-T3235 search on text, jump to result', async () => {
        const testMessage = Date.now().toString();

        // # Post message and search on text
        await postMessageAndSearchText(testMessage);

        // # Open permalink from search result post item
        const lastPost = await Post.apiGetLastPostInChannel(testChannel.id);
        const {searchResultPostItem} = await SearchScreen.getSearchResultPostItem(lastPost.post.id, testMessage);
        await expect(searchResultPostItem).toBeVisible();
        await searchResultPostItem.tap();

        // * Verify permalink post list has the message
        await PermalinkScreen.toBeVisible();
        const {postListPostItem: permalinkPostItem} = await PermalinkScreen.getPostListPostItem(lastPost.post.id, testMessage);
        await waitFor(permalinkPostItem).toBeVisible();

        // # Jump to recent messages
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify user is on channel where message is posted
        await expect(ChannelScreen.channelNavBarTitle).toHaveText(testChannel.display_name);
        const {postListPostItem: channelPostItem} = await ChannelScreen.getPostListPostItem(lastPost.post.id, testMessage);
        await expect(channelPostItem).toBeVisible();
    });
});

async function postMessageAndSearchFrom(testMessage, testUser, atMentionSuggestionList) {
    const {
        searchFromModifier,
        searchFromSection,
        searchInput,
    } = SearchScreen;

    // # Post a message
    await ChannelScreen.postMessage(testMessage);

    // # Open search screen
    await SearchScreen.open();

    // # Tap "from:" modifier
    await searchInput.clearText();
    await searchFromSection.tap();

    // # Type beginning of search term
    const searchTerm = testUser.first_name;
    await searchInput.typeText(searchTerm);

    // # Select user from autocomplete
    await expect(atMentionSuggestionList).toExist();
    const userAtMentionAutocomplete = await Autocomplete.getAtMentionItem(testUser.id);
    await userAtMentionAutocomplete.tap();

    // # Search user
    await searchInput.tapReturnKey();
    await expect(atMentionSuggestionList).not.toExist();

    // * Verify recent search item is displayed
    const searchTerms = `${searchFromModifier} ${testUser.username}`;
    const recentSearchItem = await SearchScreen.getRecentSearchItem(searchTerms);
    await expect(recentSearchItem).toBeVisible();
}

async function postMessageAndSearchText(testMessage) {
    const {searchInput} = SearchScreen;

    // # Post a message
    await ChannelScreen.postMessage(testMessage);

    // # Open search screen
    await SearchScreen.open();

    // # Type beginning of search term
    await searchInput.clearText();
    await searchInput.typeText(testMessage);

    // # Search text
    await searchInput.tapReturnKey();

    // * Verify recent search item is displayed
    const recentSearchItem = await SearchScreen.getRecentSearchItem(testMessage);
    await expect(recentSearchItem).toBeVisible();
}
