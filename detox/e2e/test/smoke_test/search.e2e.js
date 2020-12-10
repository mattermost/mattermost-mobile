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

        // * Verify search result post has the message
        const lastPost = await Post.apiGetLastPostInChannel(testChannel.id);
        const {
            searchResultPostItem,
            searchResultPostItemHeaderReply,
        } = await SearchScreen.getSearchResultPostItem(lastPost.post.id, testMessage);
        await expect(searchResultPostItem).toBeVisible();

        // # Open reply thread from search result post item
        const replyTestMessage = `reply-${testMessage}`;
        searchResultPostItemHeaderReply.tap();

        // # Post a reply message
        await ThreadScreen.toBeVisible();
        await ThreadScreen.postMessage(replyTestMessage);

        // * Verify most recent post has the reply message
        const replyPost = await Post.apiGetLastPostInChannel(testChannel.id);
        const {postListPostItem} = await ThreadScreen.getPostListPostItem(replyPost.post.id, replyTestMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel
        await ThreadScreen.back();
        await SearchScreen.back();
    });
});
