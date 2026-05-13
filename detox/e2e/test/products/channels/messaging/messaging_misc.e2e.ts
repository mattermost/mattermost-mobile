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
import {Autocomplete} from '@support/ui/component';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Misc Behaviors', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let purposeChannel: any;
    let channelB: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Pre-create channels BEFORE login so they appear in the initial channel list sync
        // (channels created post-login via WebSocket are too slow/unreliable for sidebar tests)
        const randomId = getRandomId();
        const markdownPurpose = `**bold** purpose ${randomId}`;
        const {channel: pChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'purpose',
            channel: {
                team_id: team.id,
                name: `purpose-channel-${randomId}`,
                display_name: `Purpose Channel ${randomId}`,
                type: 'O',
                purpose: markdownPurpose,
                header: '',
            },
        });
        if (!pChannel?.id) {
            throw new Error('[beforeAll] Failed to create purpose channel');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, user.id, pChannel.id);
        purposeChannel = {...pChannel, markdownPurpose};

        const {channel: bChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'channel-b',
        });
        if (!bChannel?.id) {
            throw new Error('[beforeAll] Failed to create channel B');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, user.id, bChannel.id);
        channelB = bChannel;

        // # Ensure clean state
        await device.reloadReactNative();
        await wait(timeouts.TWO_SEC);
        try {
            await HomeScreen.logout();
        } catch {
            // Not logged in — proceed to connect
        }

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

    it('MM-T77_1 - should not repeat profile info for consecutive messages from same user', async () => {
        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Post first message
        const firstMessage = `First message ${getRandomId()}`;
        await ChannelScreen.postMessage(firstMessage);
        const {post: firstPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Post second consecutive message as the same user
        const secondMessage = `Second message ${getRandomId()}`;
        await ChannelScreen.postMessage(secondMessage);
        const {post: secondPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // * Verify first post has a display name header
        const {postListPostItemHeaderDisplayName: firstPostHeader} = ChannelScreen.getPostListPostItem(firstPost.id, firstMessage);
        await expect(firstPostHeader).toExist();

        // * Verify second consecutive post does NOT show the display name again
        const {postListPostItemHeaderDisplayName: secondPostHeader} = ChannelScreen.getPostListPostItem(secondPost.id, secondMessage);
        await expect(secondPostHeader).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    // Flaky: Detox scroll() divide-by-zero on Android when FlatList hasn't fully rendered
    it.skip('MM-T216_1 - should scroll to bottom when sending a message after scrolling up', async () => {
        // # Create many posts via API to fill the channel history and enable scrolling
        for (let i = 0; i < 20; i++) {
            // eslint-disable-next-line no-await-in-loop
            await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: `Filler post ${i} ${getRandomId()}`});
        }

        // # Open channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Scroll to top of the channel to move away from the bottom.
        // scrollTo('top') starts its gesture from the bottom edge of the FlatList bounds which
        // is occluded by the post-draft input on iOS, causing a visibility failure.
        // Using scroll() with startNormalizedPositionY=0.5 (mid-screen) avoids this.
        await ChannelScreen.getFlatPostList().scroll(5000, 'up', 0.5, 0.5);
        await wait(timeouts.ONE_SEC);

        // # Send a new message from the UI
        const newMessage = `New bottom message ${getRandomId()}`;
        await ChannelScreen.postMessage(newMessage);

        // * Verify the new message is visible (view scrolled to bottom)
        const {post: lastPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(lastPost.id, newMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T511_1 - should not show deactivated user in @ mention autocomplete', async () => {
        // # Create a new user, add to team/channel, then deactivate
        const {user: deactivatedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'deact'});
        await Team.apiAddUserToTeam(siteOneUrl, deactivatedUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deactivatedUser.id, testChannel.id);
        await User.apiDeactivateUser(siteOneUrl, deactivatedUser.id);

        // # Open the channel screen and type "@username"
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText(`@${deactivatedUser.username}`);
        await wait(timeouts.ONE_SEC);

        // * Verify the deactivated user does NOT appear in autocomplete suggestions
        const {atMentionItem} = Autocomplete.getAtMentionItem(deactivatedUser.id);
        await expect(atMentionItem).not.toExist();

        // # Clear input and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();
    });

    it('MM-T1733_1 - should not render markdown in channel purpose on info screen', async () => {
        // # Scroll sidebar to find purposeChannel (may be off-screen)
        const purposeChannelDisplayNameEl = ChannelListScreen.getChannelItemDisplayName(channelsCategory, purposeChannel.name);
        await element(by.id('channel_list.flat_list')).scrollTo('top');
        await waitFor(purposeChannelDisplayNameEl).toBeVisible().
            whileElement(by.id('channel_list.flat_list')).scroll(100, 'down');
        await purposeChannelDisplayNameEl.tap();
        await ChannelScreen.dismissScheduledPostTooltip();
        await ChannelScreen.toBeVisible();

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // * Verify the purpose text shows as plain text (not rendered markdown)
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(purposeChannel.markdownPurpose);

        // # Close channel info and go back
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T2349_1 - should match user by nickname in @ autocomplete', async () => {
        // # Create a user with a known nickname
        const nicknameId = getRandomId();
        const nickname = `nick${nicknameId}`;
        const {user: nicknameUser} = await User.apiCreateUser(siteOneUrl, {
            user: {
                email: `nickuser${nicknameId}@sample.mattermost.com`,
                username: `nickuser${nicknameId}`,
                password: `P${nicknameId}!1234`,
                first_name: `FN${nicknameId}`,
                last_name: `LN${nicknameId}`,
                nickname,
            },
        });
        await Team.apiAddUserToTeam(siteOneUrl, nicknameUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, nicknameUser.id, testChannel.id);

        // # Open channel screen and type "@nickname"
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText(`@${nickname}`);

        // * Verify autocomplete is visible and user appears matched by nickname
        await Autocomplete.toBeVisible();
        const {atMentionItem} = Autocomplete.getAtMentionItem(nicknameUser.id);
        await expect(atMentionItem).toExist();

        // # Clear input and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();
    });

    it('MM-T3147_1 - should scroll to bottom when a message is received while keyboard is open', async () => {
        // # Create filler posts and the target message via API before opening the channel
        for (let i = 0; i < 15; i++) {
            // eslint-disable-next-line no-await-in-loop
            await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: `Keyboard scroll filler ${i} ${getRandomId()}`});
        }
        const incomingMessage = `Incoming message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: incomingMessage});
        const {post: incomingPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open channel screen and tap post input to open the keyboard
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify the latest post is visible at the bottom even with the keyboard open
        const {postListPostItem} = ChannelScreen.getPostListPostItem(incomingPost.id, incomingMessage);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T132_1 - should show autocomplete independently in each channel draft', async () => {
        // # Open channel A (testChannel) and type a partial @mention
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);

        // * Verify autocomplete is visible in channel A
        await Autocomplete.toBeVisible();

        // # Go back to channel list (saves draft in channel A)
        await ChannelScreen.back();

        // # Open channel B and type the same partial @mention
        await ChannelScreen.open(channelsCategory, channelB.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);

        // * Verify autocomplete works independently in channel B
        await Autocomplete.toBeVisible();
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Clear input in channel B and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();

        // # Return to channel A and verify autocomplete still works
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);

        // * Verify autocomplete is shown in channel A
        await Autocomplete.toBeVisible();

        // # Clear input and go back
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.HALF_SEC);
        await ChannelScreen.back();
    });

    it('MM-T1433_1 - should dismiss keyboard when tapping a code block', async () => {
        // # Post a message containing a code block
        const codeBlockMessage = '```\nconst x = 1;\n```';
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message: codeBlockMessage});
        const {post: codePost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open channel and tap post input to open the keyboard
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await wait(timeouts.ONE_SEC);

        // # Tap the code block — navigates to Code preview screen and dismisses the keyboard
        const {postListPostItemCodeBlock} = ChannelScreen.getPostListPostItem(codePost.id, '');
        await postListPostItemCodeBlock.tap();
        await wait(timeouts.ONE_SEC);

        // # Go back from Code preview screen to channel screen
        if (isAndroid()) {
            await device.pressBack();
        } else {
            await element(by.label('Back')).atIndex(0).tap();
        }
        await ChannelScreen.toBeVisible();

        // * Verify the keyboard is dismissed — send button is disabled (no text in draft)
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T3211_1 - should open DM from user profile accessed in reply thread', async () => {
        // # Create a second user and add to team/channel
        const {user: otherUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, otherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, otherUser.id, testChannel.id);

        // # Create a root post and a reply from the other user
        const rootMessage = `Thread root ${getRandomId()}`;
        const {post: rootPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: rootMessage,
        });
        const replyMessage = `Reply from other ${getRandomId()}`;
        const {post: replyPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: replyMessage,
            rootId: rootPost.id,
        });

        // # Open the channel and navigate to the reply thread
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await wait(timeouts.TWO_SEC);

        // * Verify root post is visible before attempting long-press
        const {postListPostItem: rootPostItem} = ChannelScreen.getPostListPostItem(rootPost.id, rootMessage);
        await waitFor(rootPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.openReplyThreadFor(rootPost.id, rootMessage);
        await ThreadScreen.toBeVisible();
        await wait(timeouts.ONE_SEC);

        // # Tap the reply author's display name to open their profile
        const {postListPostItemHeaderDisplayName: replyPostHeader} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await replyPostHeader.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify user profile screen is visible with send message option
        await UserProfileScreen.toBeVisible();
        await expect(UserProfileScreen.sendMessageProfileOption).toBeVisible();

        // # Tap send message to open a DM
        await UserProfileScreen.sendMessageProfileOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify the DM channel screen is visible
        await ChannelScreen.toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });
});
