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
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    PinnedMessagesScreen,
    PostOptionsScreen,
    RecentMentionsScreen,
    SavedMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible, waitForElementToNotExist} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

describe('Search - Recent Mentions', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let mentionPost: any;
    let ownMentionPost: any;

    beforeAll(async () => {
        // # User B = testUser (the one who will be mentioned and who logs in)
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
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

        // Unique suffix on mentionText so the matcher can't collide with
        // ownMentionPost (which also embeds @testUser.username). Without the
        // suffix, both posts share descendant text "@<username>", so a
        // `not.toExist()` assertion for mentionPost would still match the
        // sibling post's text node and fail.
        const mentionText = `Other mention ${getRandomId()} @${testUser.username}`;
        const {post: postByOther} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: mentionText,
        });
        if (!postByOther?.id) {
            throw new Error('[beforeAll] Failed to post mention as User A');
        }
        mentionPost = {...postByOther, messageText: mentionText};

        // # Fixture 2: testUser self-posts a message containing @testUser — used
        // by MM-T4909_3 (edit/reply/delete) which requires testUser to OWN the
        // post. Self-mention text is still picked up by the recent-mentions
        // search-based feed (it matches the user's @username key).
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

    it('MM-T4909_2 - should be able to display a recent mention in recent mentions screen and navigate to message channel', async () => {
        // # Open recent mentions screen
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();

        // * Verify the fixture mention is displayed with channel + team info.
        // Wait on the specific post (by id) — the generic
        // `recentMentionPostListToBeVisible()` helper matches the bare
        // `recent_mentions.post_list.post` tag, which is ambiguous when
        // multiple fixtures live in the feed.
        const {
            postListPostItem: recentMentionsPostListPostItem,
            postListPostItemChannelInfoChannelDisplayName,
            postListPostItemChannelInfoTeamDisplayName,
        } = RecentMentionsScreen.getPostListPostItem(mentionPost.id, mentionPost.messageText);
        await waitForElementToBeVisible(recentMentionsPostListPostItem, timeouts.TEN_SEC);
        await expect(postListPostItemChannelInfoChannelDisplayName).toHaveText(testChannel.display_name);
        await expect(postListPostItemChannelInfoTeamDisplayName).toHaveText(testTeam.display_name);

        // # Tap on post and jump to recent messages
        await recentMentionsPostListPostItem.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // # Dismiss the scheduled-post tutorial tooltip — it surfaces on the
        // user's first channel-open and overlays channel.screen, breaking the
        // visibility assertion below.
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify on channel screen and mention is displayed
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(mentionPost.id, mentionPost.messageText);
        await expect(channelPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    it('MM-T4909_4 - should be able to save/unsave a recent mention from recent mentions screen', async () => {
        // # Open recent mentions screen
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();

        // # Open post options for the fixture mention and tap Save
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, mentionPost.messageText);
        await PostOptionsScreen.savePostOption.tap();
        await SavedMessagesScreen.open();

        // * Verify mention appears on saved messages screen
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(mentionPost.id, mentionPost.messageText);
        await expect(postListPostItem).toBeVisible();

        // # Unsave: back to recent mentions, open post options, tap Unsave
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, mentionPost.messageText);
        await PostOptionsScreen.unsavePostOption.tap();
        await wait(timeouts.TWO_SEC);
        await SavedMessagesScreen.open();

        // * Verify mention is no longer on saved messages screen.
        await SavedMessagesScreen.verifyPostUnsaved(mentionPost.id, mentionPost.messageText);

        // # Go back to channel list screen
        await SavedMessagesScreen.close();
    });

    it('MM-T4909_5 - should be able to pin/unpin a recent mention from recent mentions screen', async () => {
        // # Open recent mentions screen
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();

        // # Open post options for the fixture mention and tap Pin to Channel
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, mentionPost.messageText);
        await PostOptionsScreen.pinPostOption.tap();

        // # Navigate to the channel's Pinned Messages screen
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify mention is displayed on pinned messages screen
        const {postListPostItem} = PinnedMessagesScreen.getPostListPostItem(mentionPost.id, mentionPost.messageText);
        await expect(postListPostItem).toBeVisible();

        // # Unpin and verify removal
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, mentionPost.messageText);
        await PostOptionsScreen.unpinPostOption.tap();

        // * Verify mention is no longer pinned
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();
        await waitForElementToNotExist(postListPostItem, timeouts.TWENTY_SEC);

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    // Must run last — mutates the shared mention fixture.
    it('MM-T4909_3 - should be able to edit, reply to, and delete a recent mention from recent mentions screen', async () => {
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
        await EditPostScreen.saveButton.tap();

        // * Verify post displays the edited indicator (single testID — combined-text
        // regex doesn't work because @mention is a separate React node).
        await waitFor(
            element(by.id('edited_indicator').withAncestor(by.id(`recent_mentions.post_list.post.${ownMentionPost.id}`))),
        ).toExist().withTimeout(timeouts.TEN_SEC);

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
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });
});
