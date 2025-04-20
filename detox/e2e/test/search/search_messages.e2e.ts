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
    Team,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PinnedMessagesScreen,
    PostOptionsScreen,
    SavedMessagesScreen,
    SearchMessagesScreen,
    ServerScreen,
    TeamDropdownMenuScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
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

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
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
        await ChannelListScreen.open();
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
        await waitFor(atMentionItem).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await atMentionItem.tap();
        await SearchMessagesScreen.searchInput.tapReturnKey();

        // * Verify search results contain messages from user
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(`from: ${testUser.username}`).tap();
        await ChannelListScreen.open();
    });

    it('MM-T5294_3 - should be able to search messages in a specific channel', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Tap on in-search-modifier, type in channel name, tap on channel mention autocomplete, and tap on search key
        await SearchMessagesScreen.searchModifierIn.tap();
        await SearchMessagesScreen.searchInput.typeText(testChannel.name);
        const {channelMentionItem} = Autocomplete.getChannelMentionItem(testChannel.name);
        await waitFor(channelMentionItem).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await channelMentionItem.tap();
        await SearchMessagesScreen.searchInput.tapReturnKey();

        // * Verify search results contain messages in channel
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(`channel: ${testChannel.name}`).tap();
        await ChannelListScreen.open();
    });

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
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(`${messagePrefix} -${excludedTerm}`).tap();
        await ChannelListScreen.open();
    });

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
        await SearchMessagesScreen.searchModifierPhrases.tap();
        await SearchMessagesScreen.searchInput.tapBackspaceKey();
        await SearchMessagesScreen.searchInput.typeText(messageWithIncludedTerm);

        // # Collapse the keyboard
        await element(by.id('search.modifier.header')).tap();
        await SearchMessagesScreen.searchModifierPhrases.tap();
        await SearchMessagesScreen.searchInput.tapBackspaceKey();
        await SearchMessagesScreen.searchInput.tapReturnKey();

        // * Verify search results only contain messages with included term
        await wait(timeouts.TWO_SEC);
        await expect(nonIncludedPostListPostItem).not.toBeVisible();
        await expect(includedPostListPostItem).toBeVisible();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(`"${messageWithIncludedTerm} "`).tap();
        await ChannelListScreen.open();
    });

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
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(`from: ${testUser.username} channel: ${testChannel.name}`).tap();
        await ChannelListScreen.open();
    });

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
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });

    it('MM-T5294_8 - should be able to search messages on a another joined team', async () => {
        // # As admin, create a second team, add user to the second team, create a new channel on second team, and add user to new channel; as user, terminate app and relaunch app
        const {team: testTeamTwo} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeamTwo.id);
        const {channel: testChannelTwo} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeamTwo.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, testChannelTwo.id);
        await device.reloadReactNative();

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
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });

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
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });

    it('MM-T5294_10 - should be able to edit, reply to, and delete a searched message from search results screen', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const searchTerm = getRandomId();
        const message = `Message ${searchTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in a search term that will yield results, tap on search key, open post options for searched message, and tap on edit option
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();

        // * Verify post message is updated and displays edited indicator '(edited)'
        const {postListPostItem: updatedPostListPostItem, postListPostItemEditedIndicator} = SearchMessagesScreen.getPostListPostItem(searchedPost.id, updatedMessage);
        await expect(updatedPostListPostItem).toBeVisible();
        await expect(postListPostItemEditedIndicator).toHaveText('(edited)');

        // # Open post options for searched message and tap on reply option
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, updatedMessage);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Post a reply
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to search results screen
        await ThreadScreen.back();

        // * Verify reply count and following button
        const {postListPostItemFooterReplyCount, postListPostItemFooterFollowingButton} = SearchMessagesScreen.getPostListPostItem(searchedPost.id, updatedMessage);
        await expect(postListPostItemFooterReplyCount).toHaveText('1 reply');
        await expect(postListPostItemFooterFollowingButton).toBeVisible();

        // # Open post options for updated searched message and delete post
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, updatedMessage);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify updated searched message is deleted
        await expect(postListPostItem).not.toExist();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });

    it('MM-T5294_11 - should be able to save/unsave a searched message from search results screen', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const searchTerm = getRandomId();
        const message = `Message ${searchTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in a search term that will yield results, tap on search key, open post options for searched message, tap on save option, and open saved messages screen
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);
        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await SavedMessagesScreen.open();

        // * Verify searched message is displayed on saved messages screen
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(searchedPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to searched messages screen, open post options for searched message, tap on usave option, and open saved messages screen
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.unsavePostOption.tap();
        await SavedMessagesScreen.open();

        // * Verify searched message is not displayed anymore on saved messages screen
        await expect(postListPostItem).not.toExist();

        // # Go back to searched messages screen, clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });

    it('MM-T5294_12 - should be able to pin/unpin a searched message from search results screen', async () => {
        // # Open a channel screen, post a message, go back to channel list screen, and open search messages screen
        const searchTerm = getRandomId();
        const message = `Message ${searchTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in a search term that will yield results, tap on search key, open post options for searched message, tap on pin to channel option, go back to channel list screen, open the channel screen where searched message is posted, open channel info screen, and open pinned messages screen
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.pinPostOption.tap();
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify searched message is displayed on pinned messages screen
        const {postListPostItem} = PinnedMessagesScreen.getPostListPostItem(searchedPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to searched messages screen, open post options for searched message, tap on unpin from channel option, go back to channel list screen, open the channel screen where searched message is posted, open channel info screen, and open pinned messages screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.unpinPostOption.tap();
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify searched message is not displayed anymore on pinned messages screen
        await expect(postListPostItem).not.toExist();

        // # Go back to searched messages screen, clear search input, remove recent search item, and go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });
});
