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
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Emoji Display', () => {
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

    it('MM-T160_1 - should display emoji-only messages as jumbo in main thread', async () => {
        // # Open a channel screen and post a message with only 1-3 emojis (no text)
        const emojiOnlyMessage = '😀😁😂';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(emojiOnlyMessage);

        // # Get the last post
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify the emoji-only post is visible in the channel
        // The post renders via the JumboEmoji component (not regular Markdown) when
        // the message contains only 1-8 emojis and no leading 4+ spaces.
        // JumboEmoji renders each emoji with testID 'markdown_emoji'.
        // TODO: The JumboEmoji component does not currently expose a dedicated 'jumbo_emoji'
        // container testID — it reuses 'markdown_emoji'. To assert jumbo rendering distinctly,
        // a testID such as 'jumbo_emoji.container' would need to be added to
        // app/components/jumbo_emoji/index.tsx.
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        const emojiElement = element(by.id('markdown_emoji').withAncestor(postItemMatcher));
        await waitFor(emojiElement).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the emoji element is visible (rendered via JumboEmoji path)
        await expect(emojiElement).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T162_1 - should display emoji-only replies as jumbo in thread view', async () => {
        // # Post a root message in the channel via API
        const rootMessage = 'Root message for emoji reply test';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: rootMessage,
        });
        const {post: rootPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Post an emoji-only reply to the root post via API
        const emojiReply = '🎉';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: emojiReply,
            rootId: rootPost.id,
        });
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open the channel and navigate to the thread
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.openReplyThreadFor(rootPost.id, rootMessage);
        await ThreadScreen.toBeVisible();

        // * Verify the emoji reply is visible in the thread
        // TODO: The JumboEmoji component does not currently expose a dedicated 'jumbo_emoji'
        // container testID. A testID such as 'jumbo_emoji.container' would need to be added
        // to app/components/jumbo_emoji/index.tsx to assert jumbo vs normal rendering.
        const replyPostMatcher = by.id(`thread.post_list.post.${replyPost.id}`);
        const emojiInThread = element(by.id('markdown_emoji').withAncestor(replyPostMatcher));
        await waitFor(emojiInThread).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the emoji element exists in the thread (rendered via JumboEmoji path)
        await expect(emojiInThread).toExist();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T4125_1 - should render emojis on multiple lines correctly', async () => {
        // # Open a channel screen and post a message with emojis on multiple lines
        // Using API to send multiline message precisely
        const multiLineEmojiMessage = '😀\n😁\n😂';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: multiLineEmojiMessage,
        });
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open the channel to view the post
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the multiline emoji post is visible in the channel
        // The post container should exist with the post ID
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        const postItem = element(postItemMatcher);
        await waitFor(postItem).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(postItem).toExist();

        // * Verify emoji elements are rendered within the post
        // Multi-line emoji-only posts render each line's emoji with testID 'markdown_emoji'.
        // Multiple elements match so use atIndex(0) to check the first one exists.
        const emojiElements = element(by.id('markdown_emoji').withAncestor(postItemMatcher)).atIndex(0);
        await expect(emojiElements).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T198_1 - should treat emoji preceded by 4+ spaces as markdown code block (not jumbo)', async () => {
        // # Post a message where an emoji is preceded by 4 spaces via API
        // The post.tsx component checks (/^\s{4}/).test(post.message) before calling
        // hasJumboEmojiOnly — 4+ leading spaces cause it to render as a code block instead.
        const fourSpaceEmojiMessage = '    😀';
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: fourSpaceEmojiMessage,
        });
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open the channel to view the post
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the post container is visible
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        const postItem = element(postItemMatcher);
        await waitFor(postItem).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(postItem).toExist();

        // * Verify the message is rendered as a code block (markdown_code_block), not jumbo emoji
        // When 4+ leading spaces are present, isJumboEmoji is false and the Message component
        // renders normally, treating the content as a markdown indented code block.
        const codeBlock = element(by.id('markdown_code_block').withAncestor(postItemMatcher));
        await expect(codeBlock).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T167_1 - should render invalid emoji syntax as plain text', async () => {
        // # Post a message with an invalid emoji name (not a real emoji)
        const invalidEmojiMessage = ':notarealemoji:';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(invalidEmojiMessage);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify the post is visible and the text renders as plain text (not as an emoji image)
        const postItemMatcher = by.id(`channel.post_list.post.${post.id}`);
        await waitFor(element(postItemMatcher)).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the invalid emoji text appears as a plain text node
        const plainTextElement = element(by.text(invalidEmojiMessage).withAncestor(postItemMatcher));
        await expect(plainTextElement).toExist();

        // * Verify no 'markdown_emoji' element is rendered (it is plain text, not an emoji)
        const emojiElement = element(by.id('markdown_emoji').withAncestor(postItemMatcher));
        await expect(emojiElement).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T151_1 - should show limited post options when long pressing a system message', async () => {
        // # Create a second user to generate a system message when added to the channel
        const {user: secondUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, secondUser.id, testTeam.id);

        // # Add second user to channel to generate a system message (e.g. "@user joined the channel")
        await Channel.apiAddUserToChannel(siteOneUrl, secondUser.id, testChannel.id);

        // # Open the channel — the system post is the newest message so it renders in the visible area
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // # Get the last post — the system add-to-channel message.
        // Since there are regular posts in the channel from prior tests, the new system post
        // is NOT combined with older user-activity posts, so its ID is 'user-activity-{postId}'.
        const {post: systemPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify the system message is visible.
        // System add-to-channel posts render via CombinedUserActivity. The inner TouchableHighlight
        // has testID 'channel.post_list.combined_user_activity.user-activity-{postId}'.
        // Use toBeVisible() — the post is the newest so it is in the visible viewport.
        const systemPostItem = element(by.id(`channel.post_list.combined_user_activity.user-activity-${systemPost.id}`));
        await waitFor(systemPostItem).toBeVisible().withTimeout(timeouts.HALF_MIN);

        // # Long press the system message.
        // CombinedUserActivity.onLongPress() returns early when canDelete is false (regular user),
        // so the post options modal should NOT open.
        await systemPostItem.longPress(timeouts.TWO_SEC);
        await wait(timeouts.TWO_SEC);

        // * Verify the post options screen does NOT appear for a non-deletable system message
        await expect(PostOptionsScreen.postOptionsScreen).not.toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
