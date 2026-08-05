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
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    RecentMentionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, waitForElementToBeVisible} from '@support/utils';
import {by, element, expect} from 'detox';

describe('Search - Recent Mentions', () => {

    const serverOneDisplayName = 'Server 1';
    let testChannel: any;
    let testUser: any;
    let ownMentionPost: any;

    beforeAll(async () => {
        // # User B = testUser (the one who will be mentioned and who logs in)
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # User A = mentioner. Add to team + channel.
        const {user: mentioner} = await User.apiCreateUser(siteOneUrl, {prefix: 'mentioner'});
        if (!mentioner?.id) {
            throw new Error('[beforeAll] Failed to create mentioner');
        }
        await Team.apiAddUserToTeam(siteOneUrl, mentioner.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, mentioner.id, channel.id);

        // # Fixture 1: User A posts @testUser — used by tests that don't require
        // ownership (display, save/unsave, pin/unpin).
        await User.apiLogin(siteOneUrl, {
            username: mentioner.username,
            password: mentioner.newUser.password,
        });

        // Unique suffix so the matcher cannot collide with ownMentionPost, which embeds the same
        // "@<username>" text node and would still satisfy a not.toExist() assertion.
        const mentionText = `Other mention ${getRandomId()} @${testUser.username}`;
        const {post: postByOther} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: mentionText,
        });
        if (!postByOther?.id) {
            throw new Error('[beforeAll] Failed to post mention as User A');
        }

        // # Fixture 2: testUser self-posts a mention of itself — MM-T4909_3 needs testUser to own
        // the post, and self-mentions still surface in the search-backed mentions feed.
        await User.apiLogin(siteOneUrl, {
            username: testUser.username,
            password: testUser.newUser.password,
        });
        const ownText = `Own mention ${getRandomId()} @${testUser.username}`;
        const {post: postByOwn} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: ownText,
        });
        if (!postByOwn?.id) {
            throw new Error('[beforeAll] Failed to post own mention as testUser');
        }
        ownMentionPost = {...postByOwn, messageText: ownText};

        // # User B (testUser) logs in via UI.
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

    // Skip: depends on app-side Saved Messages observe() fix (not in this PR).

    // Must run last — mutates the shared mention fixture. Skip: the edited mention UI never
    // updates on Android CI (29cdff, 59ec6ae, a4c0e33).

    it.skip('MM-T4909_3 - should be able to edit, reply to, and delete a recent mention from recent mentions screen', async () => {
        // # Open recent mentions screen
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();

        // # Open post options for the testUser-owned mention and tap Edit
        await RecentMentionsScreen.openPostOptionsFor(ownMentionPost.id, ownMentionPost.messageText);
        await PostOptionsScreen.editPostOption.tap();
        await EditPostScreen.toBeVisible();

        // # Edit the message and save
        const updatedMessage = `${ownMentionPost.messageText} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.save();

        // * Wait for channel API + search index (mentions fetch uses posts/search).
        await Post.waitForPostMessage(siteOneUrl, testChannel.id, ownMentionPost.id, updatedMessage);
        await Post.waitForPostMessageInSearch(
            siteOneUrl,
            `@${testUser.username} `,
            ownMentionPost.id,
            updatedMessage,
        );

        // Force a mentions refetch so the list shows the edited body (CI 59ec6ae
        // matched /edit$/ against a stale row that never updated).
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();

        // * Verify the edited state in the recent-mentions UI.
        await RecentMentionsScreen.verifyPostEdited(ownMentionPost.id, updatedMessage);

        // # Open post options via header date_time long-press (avoids the @mention tap handler)
        await element(by.id('post_header.date_time').withAncestor(by.id(`recent_mentions.post_list.post.${ownMentionPost.id}`))).longPress(timeouts.TWO_SEC);
        await PostOptionsScreen.replyPostOption.tap();
        await ThreadScreen.toBeVisible();

        // # Post a reply
        const replyMessage = `${ownMentionPost.messageText} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify the reply is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(postListPostItem).toBeVisible();

        // # Back to recent mentions and verify reply count
        await ThreadScreen.back();
        await waitForElementToBeVisible(element(by.text('1 reply')), timeouts.TEN_SEC);

        // # Delete the post via post options
        await element(by.id('post_header.date_time').withAncestor(by.id(`recent_mentions.post_list.post.${ownMentionPost.id}`))).longPress(timeouts.TWO_SEC);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify mention is removed
        await expect(element(by.id(`recent_mentions.post_list.post.${ownMentionPost.id}`))).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });
});
