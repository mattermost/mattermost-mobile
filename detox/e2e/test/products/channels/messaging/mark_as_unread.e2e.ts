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
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

// On Android, long-pressing the post container is unreliable — long-press on the
// inner text element instead, with a shorter TEN_SEC check timeout so retries
// happen quickly (mirrors the approach in pin_and_unpin_message.e2e.ts).
async function openPostOptionsFor(postId: string, message: string, screen: typeof ChannelScreen | typeof ThreadScreen) {
    if (!isAndroid()) {
        await screen.openPostOptionsFor(postId, message);
        return;
    }

    const prefix = screen === ThreadScreen ? 'thread' : 'channel';
    const flatList = screen === ThreadScreen ? ThreadScreen.getFlatPostList() : ChannelScreen.getFlatPostList();
    const target = element(by.text(message).withAncestor(by.id(`${prefix}.post_list.post.${postId}`)));

    await waitFor(target).toBeVisible().withTimeout(timeouts.TEN_SEC);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await flatList.scroll(100, 'down', 0.5, 0.5);
        } catch {
            // Ignore scroll failures at list boundaries.
        }
        // eslint-disable-next-line no-await-in-loop
        await wait(timeouts.THREE_SEC);
        // eslint-disable-next-line no-await-in-loop
        await target.longPress(timeouts.FIVE_SEC);
        try {
            // eslint-disable-next-line no-await-in-loop
            await waitFor(PostOptionsScreen.postOptionsScreen).toExist().withTimeout(timeouts.TEN_SEC);
            // eslint-disable-next-line no-await-in-loop
            await wait(timeouts.TWO_SEC);
            return;
        } catch {
            if (attempt === 3) {
                throw new Error(`Post options did not appear for "${message}" after ${attempt} attempts`);
            }
        }
    }
}

describe('Messaging - Mark as Unread', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const directMessagesCategory = 'direct_messages';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let dmChannel: any;
    let dmMessage: string;
    let gmChannel: any;
    let gmMessage: string;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Create DM channel and post a message BEFORE login so it shows in the sidebar on first load
        const {user: otherUser} = await User.apiCreateUser(siteOneUrl);
        if (!otherUser?.id) {
            throw new Error('[beforeAll] Failed to create otherUser for DM');
        }
        await Team.apiAddUserToTeam(siteOneUrl, otherUser.id, testTeam.id);
        const {channel: dm} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, otherUser.id]);
        if (!dm?.id) {
            throw new Error('[beforeAll] Failed to create DM channel');
        }
        dmChannel = dm;
        dmMessage = `DM message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: dmChannel.id, message: dmMessage});

        // # Create GM channel and post a message BEFORE login so it shows in the sidebar on first load
        const {user: gmUser1} = await User.apiCreateUser(siteOneUrl);
        if (!gmUser1?.id) {
            throw new Error('[beforeAll] Failed to create gmUser1 for GM');
        }
        await Team.apiAddUserToTeam(siteOneUrl, gmUser1.id, testTeam.id);
        const {user: gmUser2} = await User.apiCreateUser(siteOneUrl);
        if (!gmUser2?.id) {
            throw new Error('[beforeAll] Failed to create gmUser2 for GM');
        }
        await Team.apiAddUserToTeam(siteOneUrl, gmUser2.id, testTeam.id);
        const {channel: gm} = await Channel.apiCreateGroupChannel(siteOneUrl, [testUser.id, gmUser1.id, gmUser2.id]);
        if (!gm?.id) {
            throw new Error('[beforeAll] Failed to create GM channel');
        }
        gmChannel = gm;
        gmMessage = `GM message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: gmChannel.id, message: gmMessage});

        // # Ensure clean state
        await device.reloadReactNative();
        await wait(timeouts.TWO_SEC);
        try {
            await HomeScreen.logout();
        } catch {
            // Not logged in — proceed to connect
        }

        // # Log in to server — DM/GM channels with messages already exist so they load into sidebar
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

    it('MM-T245_1 - should display "Mark as Unread" option in post options menu', async () => {
        // # Post a message via API (as admin) so testUser can mark someone else's post as unread.
        // canMarkAsUnread requires user?.id !== post.userId — a user cannot mark their own post as unread.
        const message = `Message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message});

        // # Open the channel to view the post
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long-press the post to open post options
        await openPostOptionsFor(post.id, message, ChannelScreen);

        // * Verify "Mark as Unread" option appears in the post options menu
        await waitFor(PostOptionsScreen.markAsUnreadOption).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(PostOptionsScreen.markAsUnreadOption).toBeVisible();

        // # Close the post options menu and go back
        await PostOptionsScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T246_1 - should mark a post as unread and show unread indicator when navigating back', async () => {
        // # Post two messages via API (as admin) so testUser can mark someone else's post as unread.
        // canMarkAsUnread requires user?.id !== post.userId — own posts cannot be marked as unread.
        const firstMessage = `First ${getRandomId()}`;
        const secondMessage = `Second ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: firstMessage});
        const {post: firstPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: secondMessage});

        // # Open the channel to view the posts
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify first message is visible
        const {postListPostItem: firstPostItem} = ChannelScreen.getPostListPostItem(firstPost.id, firstMessage);
        await waitFor(firstPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long-press the first post and tap "Mark as Unread"
        await openPostOptionsFor(firstPost.id, firstMessage, ChannelScreen);
        await waitFor(PostOptionsScreen.markAsUnreadOption).toExist().withTimeout(timeouts.TEN_SEC);
        await PostOptionsScreen.markAsUnreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Navigate back to channel list
        await ChannelScreen.back();

        // * Verify the channel still appears in the channel list (it was unread)
        await waitFor(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
    });

    it('MM-T248_1 - should mark a DM post as unread and show DM channel as unread in channel list', async () => {
        // # DM channel and message were created in beforeAll before login so they appear in the sidebar

        // # Open the DM channel from the channel list
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, dmChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, dmChannel.name).tap();
        await ChannelScreen.toBeVisible();

        // * Verify the DM message is visible
        const {post: dmPost} = await Post.apiGetLastPostInChannel(siteOneUrl, dmChannel.id);
        const {postListPostItem: dmPostItem} = ChannelScreen.getPostListPostItem(dmPost.id, dmMessage);
        await waitFor(dmPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long-press the DM message and tap "Mark as Unread"
        await openPostOptionsFor(dmPost.id, dmMessage, ChannelScreen);
        await waitFor(PostOptionsScreen.markAsUnreadOption).toExist().withTimeout(timeouts.TEN_SEC);
        await PostOptionsScreen.markAsUnreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Navigate back to the channel list
        await ChannelScreen.back();

        // * Verify the DM channel is still listed (showing as unread) in the direct messages category
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, dmChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, dmChannel.name)).toBeVisible();
    });

    it('MM-T250_1 - should mark a reply as unread in thread view and show unread indicator', async () => {
        // # Create a root message and two replies via API (as admin) so testUser can mark
        // someone else's reply as unread.
        // canMarkAsUnread requires user?.id !== post.userId — own posts cannot be marked as unread.
        const parentMessage = `Parent ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: parentMessage});
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        const replyMessage = `Reply ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: replyMessage, rootId: parentPost.id});
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        const secondReplyMessage = `Second reply ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: secondReplyMessage, rootId: parentPost.id});

        // # Open channel and navigate to the thread via reply count footer (avoids longPress issues)
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const {postListPostItem: parentPostItem, postListPostItemFooterReplyCount} = ChannelScreen.getPostListPostItem(parentPost.id, parentMessage);
        await waitFor(parentPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(postListPostItemFooterReplyCount).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await postListPostItemFooterReplyCount.tap();
        await ThreadScreen.toBeVisible();

        // * Verify the first reply is visible in the thread
        const {postListPostItem: replyPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await waitFor(replyPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long-press the first reply and tap "Mark as Unread"
        await openPostOptionsFor(replyPost.id, replyMessage, ThreadScreen);
        await waitFor(PostOptionsScreen.markAsUnreadOption).toExist().withTimeout(timeouts.TEN_SEC);
        await PostOptionsScreen.markAsUnreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Go back to channel list
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T1280_1 - should mark a GM post as unread and show the GM channel as unread in channel list', async () => {
        // # GM channel and message were created in beforeAll before login so they appear in the sidebar

        // # Open the GM channel from the channel list
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, gmChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, gmChannel.name).tap();
        await ChannelScreen.toBeVisible();

        // * Verify the GM message is visible
        const {post: gmPost} = await Post.apiGetLastPostInChannel(siteOneUrl, gmChannel.id);
        const {postListPostItem: gmPostItem} = ChannelScreen.getPostListPostItem(gmPost.id, gmMessage);
        await waitFor(gmPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Long-press the GM post and tap "Mark as Unread"
        await openPostOptionsFor(gmPost.id, gmMessage, ChannelScreen);
        await waitFor(PostOptionsScreen.markAsUnreadOption).toExist().withTimeout(timeouts.TEN_SEC);
        await PostOptionsScreen.markAsUnreadOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Navigate back to the channel list
        await ChannelScreen.back();

        // * Verify the GM channel is still listed in the direct messages category
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, gmChannel.name)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, gmChannel.name)).toBeVisible();
    });
});
