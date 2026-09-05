// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Post, Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    HomeScreen,
    LoginScreen,
    RecentMentionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Channel-wide Mention and Keyword (Recipient)', () => {
    const serverOneDisplayName = 'Server 1';
    let testChannel: any;
    let mentioner: any;
    let recipient: any;
    let keyword: string;
    let keywordPostId = '';
    let keywordPostText: string;

    beforeAll(async () => {
        // # User B (recipient) owns the team/channel created by apiInit; user A posts the mentions
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        recipient = user;

        // # User A (mentioner) joins the same team and channel
        ({user: mentioner} = await User.apiCreateUser(siteOneUrl, {prefix: 'mentioner'}));
        if (!mentioner?.id) {
            throw new Error('[beforeAll] Failed to create mentioner');
        }
        await Team.apiAddUserToTeam(siteOneUrl, mentioner.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, mentioner.id, channel.id);

        // # Configure B's keyword notification and channel-mention notification.
        // notify_props, not a preference: mention_keys is the server's keyword field
        // (app/screens/settings/notification_mention/mention_settings.tsx). The keyword
        // is unique per run so no other content can match it. The keyword-settings UI
        // itself is covered by mention_notification_settings.e2e.ts (MM-T5107).
        keyword = `e2e-${getRandomId()}`;
        await User.apiLogin(siteOneUrl, {
            username: recipient.newUser.username,
            password: recipient.newUser.password,
        });
        const patchResult = await User.apiPatchUser(siteOneUrl, 'me', {
            notify_props: {
                channel: 'true',
                mention_keys: keyword,
            },
        });
        if (patchResult.error) {
            throw new Error(`[beforeAll] Failed to configure recipient keyword: ${JSON.stringify(patchResult.error)}`);
        }

        // # User A posts a channel-wide mention and the keyword post
        await User.apiLogin(siteOneUrl, {
            username: mentioner.username,
            password: mentioner.newUser.password,
        });
        const {error: channelPostError} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: `Channel-wide attention @channel ${getRandomId()}`,
        });
        if (channelPostError) {
            throw new Error(`[beforeAll] Failed to post channel-wide mention: ${JSON.stringify(channelPostError)}`);
        }

        keywordPostText = `Keyword ping ${keyword}`;
        const {post: postedKeyword} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: keywordPostText,
        });
        if (!postedKeyword?.id) {
            throw new Error('[beforeAll] Failed to post keyword message as mentioner');
        }
        keywordPostId = postedKeyword.id;

        // # User B logs in via UI and observes
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(recipient);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T510 - should deliver the channel-wide mention and surface the keyword post to the recipient', async () => {

        await User.apiLogin(siteOneUrl, {
            username: recipient.newUser.username,
            password: recipient.newUser.password,
        });
        const unread = await Channel.apiGetUnreadMessages(siteOneUrl, recipient.id, testChannel.id);
        if (unread.error) {
            throw new Error(`[MM-T510] Failed to fetch recipient mention counts: ${JSON.stringify(unread.error)}`);
        }
        const mentionCount = (unread.data as any)?.mention_count;
        if (!mentionCount || mentionCount < 2) {
            throw new Error(`[MM-T510] Expected the recipient's mention count to cover both posts (>= 2), got ${mentionCount}`);
        }

        // * Verify the keyword-triggered post is in the recipient's recent mentions
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();
        const {postListPostItem: keywordPostItem} = RecentMentionsScreen.getPostListPostItem(keywordPostId, keywordPostText);
        await waitFor(keywordPostItem).toExist().withTimeout(timeouts.HALF_MIN);
        await expect(keywordPostItem).toExist();
    });
});
