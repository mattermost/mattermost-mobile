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
import {getRandomId, isAndroid, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

describe('Search - Recent Mentions', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let mentioner: any;

    const loginAsMentioner = async () => {
        await User.apiLogin(siteOneUrl, {
            username: mentioner.username,
            password: mentioner.newUser.password,
        });
    };

    const loginAsTestUser = async () => {
        await User.apiLogin(siteOneUrl, {
            username: testUser.username,
            password: testUser.newUser.password,
        });
    };

    const createOtherUserMentionPost = async () => {
        await loginAsMentioner();
        const mentionText = `Other mention ${getRandomId()} @${testUser.username}`;
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: mentionText,
        });
        if (!post?.id) {
            throw new Error('Failed to post mention as User A');
        }
        await loginAsTestUser();
        return {...post, messageText: mentionText};
    };

    const createOwnMentionPost = async () => {
        await loginAsTestUser();
        const ownText = `Own mention ${getRandomId()} @${testUser.username}`;
        const {post} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: ownText,
        });
        if (!post?.id) {
            throw new Error('Failed to post own mention as testUser');
        }
        return {...post, messageText: ownText};
    };

    beforeAll(async () => {
        // # User B = testUser (the one who will be mentioned and who logs in)
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # User A = mentioner. Add to team + channel.
        const {user: createdMentioner} = await User.apiCreateUser(siteOneUrl, {prefix: 'mentioner'});
        if (!createdMentioner?.id) {
            throw new Error('[beforeAll] Failed to create mentioner');
        }
        mentioner = createdMentioner;
        await Team.apiAddUserToTeam(siteOneUrl, mentioner.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, mentioner.id, channel.id);

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
        const mentionPost = await createOtherUserMentionPost();

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
        const mentionPost = await createOtherUserMentionPost();

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
        // Poll: unsave preference deletion propagates through the observable.
        await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4909_5 - should be able to pin/unpin a recent mention from recent mentions screen', async () => {
        const mentionPost = await createOtherUserMentionPost();

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
        await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    it('MM-T4909_3 - should be able to edit, reply to, and delete a recent mention from recent mentions screen', async () => {
        const ownMentionPost = await createOwnMentionPost();

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
        if (isAndroid()) {
            await wait(timeouts.ONE_SEC);
        }
        await EditPostScreen.saveButton.tap();

        // * Verify post displays the edited indicator after save completes.
        // PostWithChannelInfo uses default memo and skips in-place editAt updates;
        // scroll the FlatList (removeClippedSubviews) to recycle the cell so it
        // remounts with fresh DB state. Match pinned_messages Android polling.
        await waitForElementToBeVisible(RecentMentionsScreen.recentMentionsScreen, timeouts.TWENTY_SEC);
        try {
            const flatList = RecentMentionsScreen.getFlatPostList();
            await flatList.scroll(300, 'down', 0.5, 0.5);
            await wait(timeouts.HALF_SEC);
            await flatList.scrollTo('top');
        } catch { /* list may not scroll */ }

        const postItemTestID = `recent_mentions.post_list.post.${ownMentionPost.id}`;
        const {postListPostItemEditedIndicator} = RecentMentionsScreen.getPostListPostItem(ownMentionPost.id);
        if (isAndroid()) {
            await waitForElementToBeVisible(postListPostItemEditedIndicator, timeouts.TWENTY_SEC);
        } else {
            // iOS collapses nested Text testIDs; @mention is a separate node so
            // assertPostMessageEdited's combined-text regex also fails here.
            await waitForElementToBeVisible(
                element(by.text('Edited').withAncestor(by.id(postItemTestID))),
                timeouts.TWENTY_SEC,
            );
        }

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

        // * Verify mention is removed from recent mentions
        const {postListPostItem: deletedMentionItem} = RecentMentionsScreen.getPostListPostItem(
            ownMentionPost.id,
            ownMentionPost.messageText,
        );
        await expect(deletedMentionItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });
});
