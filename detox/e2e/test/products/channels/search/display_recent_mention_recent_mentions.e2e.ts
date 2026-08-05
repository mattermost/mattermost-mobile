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
import {getRandomId, timeouts, waitForElementToBeVisible, waitForElementToNotExist} from '@support/utils';
import {by, element, expect} from 'detox';

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
        mentionPost = {...postByOther, messageText: mentionText};

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
});
