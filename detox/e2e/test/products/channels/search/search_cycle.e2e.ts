// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AddMembersScreen,
    ChannelListScreen,
    ChannelScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    PostOptionsScreen,
    SearchMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Search - Search Cycle', () => {
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

    it('MM-T3235 - should be able to search on text and jump to result in channel', async () => {
        // # Open channel screen and post a message with a unique search term
        const searchTerm = getRandomId();
        const message = `Search test ${searchTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen and open search messages screen
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in the search term and tap on search key
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify search results contain the posted message
        const {postListPostItem: searchResultPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(searchResultPostItem).toBeVisible();

        // # Tap on the search result post to open the permalink view
        await searchResultPostItem.tap();

        // * Verify permalink screen is visible
        await PermalinkScreen.toBeVisible();

        // # Tap on "Jump to recent messages" button
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify the channel screen is displayed (jumped to the channel where the message was posted)
        await ChannelScreen.toBeVisible();

        // # Go back to channel list, then open search to clear the stale search term
        await ChannelScreen.back();
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        await ChannelListScreen.open();
    });

    it('MM-T373 - should be able to post a comment from search results', async () => {
        // # Post message with unique term "asparagus" + random suffix for isolation
        const uniqueSuffix = getRandomId();
        const searchTerm = `asparagus${uniqueSuffix}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(searchTerm);

        // * Verify message is posted
        const {post: originalPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(originalPost.id, searchTerm);
        await expect(channelPostItem).toBeVisible();

        // # Go back to channel list screen and open search messages screen
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Search for the term and tap on search key
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify search results contain the posted message
        const {postListPostItem: searchResultPostItem} = SearchMessagesScreen.getPostListPostItem(originalPost.id, searchTerm);
        await expect(searchResultPostItem).toBeVisible();

        // # Open post options for the search result and tap the reply option
        await SearchMessagesScreen.openPostOptionsFor(originalPost.id, searchTerm);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on thread screen (RHS switches to reply thread view)
        await ThreadScreen.toBeVisible();

        // # Type a reply and post it
        const replyMessage = `Replying to ${searchTerm}`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted and stays in reply / message thread view
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(replyPostItem).toBeVisible();

        // * Verify still on thread screen (not navigated away)
        await ThreadScreen.toBeVisible();

        // # Go back to search results screen
        await ThreadScreen.back();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });

    it('MM-T2507 - should find DM channel by username, first name, last name, and nickname', async () => {
        // # Create a new user with known first name, last name, and nickname
        const randomId = getRandomId();
        const newUser = {
            email: `findme${randomId}@sample.mattermost.com`,
            username: `findme${randomId}`,
            password: `P${randomId}!1234`,
            first_name: `First${randomId}`,
            last_name: `Last${randomId}`,
            nickname: `Nick${randomId}`,
        };
        const {user: targetUser} = await User.apiCreateUser(siteOneUrl, {user: newUser});
        await Team.apiAddUserToTeam(siteOneUrl, targetUser.id, testTeam.id);

        // # Open create direct message screen (which uses the "Find channel" flow)
        await CreateDirectMessageScreen.open();

        // * Verify on create direct message screen
        await CreateDirectMessageScreen.toBeVisible();

        // # Dismiss the long-press tutorial overlay on Android (same modal pattern as members screen)
        if (isAndroid()) {
            await AddMembersScreen.dismissTutorial();
        }

        // # Type the username of the target user and verify they are returned
        await CreateDirectMessageScreen.searchInput.typeText(`@${targetUser.username}`);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by username search
        const userItem = CreateDirectMessageScreen.getUserItem(targetUser.id);
        await expect(userItem).toBeVisible();

        // # Clear search and type the first name of the target user
        await CreateDirectMessageScreen.searchInput.clearText();
        await CreateDirectMessageScreen.searchInput.typeText(targetUser.first_name);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by first name search
        await expect(userItem).toBeVisible();

        // # Clear search and type the last name of the target user
        await CreateDirectMessageScreen.searchInput.clearText();
        await CreateDirectMessageScreen.searchInput.typeText(targetUser.last_name);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by last name search
        await expect(userItem).toBeVisible();

        // # Clear search and type the nickname of the target user
        await CreateDirectMessageScreen.searchInput.clearText();
        await CreateDirectMessageScreen.searchInput.typeText(targetUser.nickname);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by nickname search
        await expect(userItem).toBeVisible();

        // # Close create direct message screen and go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
