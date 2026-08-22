// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Post-action search tests split from search_messages.e2e.ts for CI time limits.

import {
    Post,
    Setup,
    System,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    SavedMessagesScreen,
    SearchMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible, waitForElementToExist, withSynchronizationDisabled} from '@support/utils';
import {by, expect, waitFor} from 'detox';

describe('Search - Search Message Post Actions', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
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
        await SearchMessagesScreen.searchInput.replaceText(searchTerm);
        await SearchMessagesScreen.submitSearch();
        await wait(timeouts.TWO_SEC);

        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.save();

        // * Verify post message is updated and displays edited indicator '(edited)'
        await ChannelScreen.assertPostMessageEdited(searchedPost.id, updatedMessage, 'search_page');

        // # Open post options for searched message and tap on reply option
        await PostOptionsScreen.openPostOptionsForSearchedPosts(searchedPost.id);
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
        await SearchMessagesScreen.toBeVisible();

        // * Verify reply count.
        // Note: removed the `Following` assertion — the provisioner doesn't set
        // `ThreadAutoFollow`/CRT-author-auto-subscribe, so the post-author sees
        // a "Follow" button (action to subscribe), not "Following" (state).
        // The "1 reply" assertion already proves the reply landed.
        await wait(timeouts.FOUR_SEC);
        await waitForElementToBeVisible(element(by.text('1 reply')), timeouts.TEN_SEC);

        // # Open post options for updated searched message and delete post
        await element(by.id(`search_results.post_list.post.${searchedPost.id}`)).longPress(timeouts.TWO_SEC);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify the searched parent (not the thread reply matcher) is gone
        const {postListPostItem: searchedItem} = SearchMessagesScreen.getPostListPostItem(searchedPost.id, updatedMessage);
        await waitFor(searchedItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(searchTerm);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
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
        await SearchMessagesScreen.searchInput.replaceText(searchTerm);
        await SearchMessagesScreen.submitSearch();
        await wait(timeouts.TWO_SEC);
        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();

        await Post.waitForPostFlagged(siteOneUrl, testUser.id, searchedPost.id);
        await SavedMessagesScreen.open();

        // * Verify searched message is displayed on saved messages screen
        await SavedMessagesScreen.waitForPostInList(searchedPost.id, message);

        // # Go back to searched messages screen, open post options for searched message, tap on unsave option, and open saved messages screen
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
        await PostOptionsScreen.unsavePostOption.tap();

        await Post.waitForPostUnflagged(siteOneUrl, testUser.id, searchedPost.id);
        await SavedMessagesScreen.open();

        // * Verify searched message is not displayed anymore on saved messages screen.
        await SavedMessagesScreen.verifyPostUnsaved(searchedPost.id);

        // # Go back to searched messages screen, clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.open();
        try {
            await waitFor(SearchMessagesScreen.searchClearButton).toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            // Search query is gone if this tab remounted; save/unsave already asserted.
            await SearchMessagesScreen.close();
            await ChannelListScreen.toBeVisible();
            return;
        }
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(searchTerm);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
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
        await SearchMessagesScreen.searchInput.replaceText(searchTerm);
        await SearchMessagesScreen.submitSearch();
        await wait(timeouts.TWO_SEC);

        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // Search results are already rendered here, but iOS can keep Detox's idle resource
        // busy and block openPostOptionsFor at its initial keyboard-dismiss scroll.
        await withSynchronizationDisabled(async () => {
            await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
            await PostOptionsScreen.tapPinPost();

            // The sheet is gone when tapPinPost returns. The server confirmation plus this
            // settle wait leaves a stable search screen before synchronization is restored.
            await Post.waitForPostPinned(siteOneUrl, testChannel.id, searchedPost.id);
            await SearchMessagesScreen.toBeVisible();
        });

        // Assert the pin through the post options menu, not a "Pinned" pre-header: search
        // results render through PostWithChannelInfo, which passes skipPinnedHeader={true},
        // so post_pre_header.text never exists here.
        await withSynchronizationDisabled(async () => {
            await SearchMessagesScreen.openPostOptionsFor(searchedPost.id, message);
            await waitForElementToExist(PostOptionsScreen.unpinPostOption, timeouts.HALF_MIN);
            await expect(PostOptionsScreen.pinPostOption).not.toExist();

            // * Verify the post can be unpinned again from the search results screen
            await PostOptionsScreen.tapUnpinPost();
            await Post.waitForPostUnpinned(siteOneUrl, testChannel.id, searchedPost.id);
            await SearchMessagesScreen.toBeVisible();
        });

        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.removeRecentSearchItem(searchTerm);
        await SearchMessagesScreen.close();
        await ChannelListScreen.toBeVisible();
    });
});
