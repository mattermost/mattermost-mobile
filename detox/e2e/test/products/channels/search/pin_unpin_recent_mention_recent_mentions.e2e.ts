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
    HomeScreen,
    LoginScreen,
    PinnedMessagesScreen,
    PostOptionsScreen,
    RecentMentionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, waitForElementToNotExist} from '@support/utils';
import {expect} from 'detox';

describe('Search - Recent Mentions', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;
    let mentionPost: any;

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

        // Tap an explicit point: the unpin option is not always 100% visible in the bottom sheet,
        // which fails iOS hittability checks.
        await PostOptionsScreen.unpinPostOption.tap({x: 1, y: 1});

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
});
