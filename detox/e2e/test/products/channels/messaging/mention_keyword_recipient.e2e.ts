// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// MM-T510, the five-channel mention matrix. A second user posts, in five different channels the
// recipient belongs to, one message each: `@channel`, `@all`, the recipient's keyword, a DM, and a
// GM with no mention words. All five count as one mention for the recipient: the server adds an
// implicit GM mention to every member on every group-message post (app/notification.go, "Add a GM
// mention to all members of a GM channel"), exactly as it does for a DM, so the GM row carries a
// badge too. The test case's "(no mention)" for the GM is about the push text -- "posted a
// message" rather than "mentioned you" -- which is not observable here.
//
// Two server rules shape the setup, both verified against a live server:
//   - being added to a channel by someone else is itself an implicit mention for the added user
//     (app/notification.go, PostTypeAddToChannel). apiInit and createSharedChannel add the recipient
//     via the admin session, so the recipient views those channels before anything is posted;
//     otherwise every public channel starts at mention_count=1 and exact counts are impossible.
//   - the server decides what is a mention at post time, so the recipient's keyword is configured
//     before the mentioner posts.
//
// What is asserted is the server's per-channel mention/unread state and the app's rendering of it
// (sidebar badges, Recent Mentions). The push notification that each mention would also produce is
// not observable here: the PR test servers have no push proxy and simulators receive no APNs/FCM.
// The tap-to-open half of the case is covered by notifications/push_notification_open.e2e.ts.

import {Channel, Post, Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    RecentMentionsScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

type MatrixEntry = {
    label: string;
    channel: any;
    category: string;
    mentions: number;
};

describe('Messaging - Channel-wide Mention and Keyword (Recipient)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const directMessagesCategory = 'direct_messages';
    let mentioner: any;
    let recipient: any;
    let keyword: string;
    let keywordPostId = '';
    let keywordPostText: string;
    let matrix: MatrixEntry[];

    // Public channels are created under the admin session that apiInit leaves active, so
    // membership does not depend on a regular user's add-member permission.
    const createSharedChannel = async (teamId: string, prefix: string, memberIds: string[]) => {
        const {channel, error} = await Channel.apiCreateChannel(siteOneUrl, {teamId, prefix});
        if (error || !channel?.id) {
            throw new Error(`[beforeAll] Failed to create ${prefix} channel: ${JSON.stringify(error)}`);
        }
        for (const memberId of memberIds) {
            // eslint-disable-next-line no-await-in-loop -- membership is set up in order
            const {error: addError} = await Channel.apiAddUserToChannel(siteOneUrl, memberId, channel.id);
            if (addError) {
                throw new Error(`[beforeAll] Failed to add ${memberId} to ${prefix} channel: ${JSON.stringify(addError)}`);
            }
        }
        return channel;
    };

    const postAs = async (channelId: string, message: string) => {
        const {post, error} = await Post.apiCreatePost(siteOneUrl, {channelId, message});
        if (error || !post?.id) {
            throw new Error(`[beforeAll] Failed to post "${message}": ${JSON.stringify(error)}`);
        }
        return post;
    };

    beforeAll(async () => {
        // # User B (recipient) owns the team/channel created by apiInit; user A posts the mentions
        const {channel: channelMentionChannel, team, user} = await Setup.apiInit(siteOneUrl);
        recipient = user;

        // # User A (mentioner) joins the same team and channel
        ({user: mentioner} = await User.apiCreateUser(siteOneUrl, {prefix: 'mentioner'}));
        if (!mentioner?.id) {
            throw new Error('[beforeAll] Failed to create mentioner');
        }
        await Team.apiAddUserToTeam(siteOneUrl, mentioner.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, mentioner.id, channelMentionChannel.id);

        // # A third member makes the GM a group channel rather than a second DM
        const {user: bystander} = await User.apiCreateUser(siteOneUrl, {prefix: 'bystander'});
        if (!bystander?.id) {
            throw new Error('[beforeAll] Failed to create GM bystander');
        }
        await Team.apiAddUserToTeam(siteOneUrl, bystander.id, team.id);

        // # One channel per mention type, all with both users as members
        const allMentionChannel = await createSharedChannel(team.id, 'all-mention', [recipient.id, mentioner.id]);
        const keywordChannel = await createSharedChannel(team.id, 'keyword', [recipient.id, mentioner.id]);

        // # Configure B's keyword notification and channel-mention notification BEFORE anything is
        // posted: the server decides what counts as a mention at post time. notify_props, not a
        // preference: mention_keys is the server's keyword field, and `channel` is what makes
        // @channel/@all count. The keyword is unique per run so nothing else can match it. The
        // settings UI itself is covered by mention_notification_settings.e2e.ts (MM-T5107).
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

        // # Clear the implicit add-to-channel mentions so every channel starts from zero
        for (const channel of [channelMentionChannel, allMentionChannel, keywordChannel]) {
            // eslint-disable-next-line no-await-in-loop -- sequential setup
            const {error: viewError} = await Channel.apiViewChannel(siteOneUrl, recipient.id, channel.id);
            if (viewError) {
                throw new Error(`[beforeAll] Failed to view ${channel.name} as recipient: ${JSON.stringify(viewError)}`);
            }
        }

        // # User A opens the DM and GM with B and posts one message in each of the five channels
        await User.apiLogin(siteOneUrl, {
            username: mentioner.username,
            password: mentioner.newUser.password,
        });
        const {channel: dmChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [mentioner.id, recipient.id]);
        if (!dmChannel?.id) {
            throw new Error('[beforeAll] Failed to create DM channel');
        }
        const {channel: gmChannel} = await Channel.apiCreateGroupChannel(siteOneUrl, [mentioner.id, recipient.id, bystander.id]);
        if (!gmChannel?.id) {
            throw new Error('[beforeAll] Failed to create GM channel');
        }

        await postAs(channelMentionChannel.id, `Channel-wide attention @channel ${getRandomId()}`);
        await postAs(allMentionChannel.id, `Everyone please read @all ${getRandomId()}`);
        keywordPostText = `Keyword ping ${keyword}`;
        keywordPostId = (await postAs(keywordChannel.id, keywordPostText)).id;
        await postAs(dmChannel.id, `Direct message ${getRandomId()}`);
        await postAs(gmChannel.id, `Group message with no mention words ${getRandomId()}`);

        matrix = [
            {label: '@channel', channel: channelMentionChannel, category: channelsCategory, mentions: 1},
            {label: '@all', channel: allMentionChannel, category: channelsCategory, mentions: 1},
            {label: 'keyword', channel: keywordChannel, category: channelsCategory, mentions: 1},
            {label: 'DM', channel: dmChannel, category: directMessagesCategory, mentions: 1},
            {label: 'GM without mention words', channel: gmChannel, category: directMessagesCategory, mentions: 1},
        ];

        // # User B logs in via UI and observes
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(recipient);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T510_1 - should count exactly one mention per channel for @channel, @all, keyword, DM and GM', async () => {
        // * Verify the server's per-channel state for the recipient. Exact counts: each channel
        // received exactly one post from the mentioner, and the add-to-channel mentions were viewed away.
        await User.apiLogin(siteOneUrl, {
            username: recipient.newUser.username,
            password: recipient.newUser.password,
        });
        const mismatches: string[] = [];
        for (const {label, channel, mentions} of matrix) {
            // eslint-disable-next-line no-await-in-loop -- one report over all five, in matrix order
            const unread = await Channel.apiGetUnreadMessages(siteOneUrl, recipient.id, channel.id);
            if (unread.error) {
                throw new Error(`[MM-T510_1] Failed to fetch unread state for ${label}: ${JSON.stringify(unread.error)}`);
            }
            const {mention_count: mentionCount, msg_count: msgCount} = unread.data as any;
            if (mentionCount !== mentions || !msgCount) {
                mismatches.push(`${label}: expected mention_count=${mentions} msg_count>=1, got mention_count=${mentionCount} msg_count=${msgCount}`);
            }
        }
        if (mismatches.length) {
            throw new Error(`[MM-T510_1] Mention matrix mismatch:\n${mismatches.join('\n')}`);
        }
    });

    it('MM-T510_2 - should show a "1" mention badge on every row of the matrix', async () => {
        // * Verify the sidebar renders the same matrix: each of the five rows carries a "1" badge
        await ChannelListScreen.toBeVisible();

        /* eslint-disable no-await-in-loop -- sequential assertions on one sidebar */
        for (const {channel, category, mentions} of matrix) {
            const row = ChannelListScreen.getChannelItemDisplayName(category, channel.name);
            await waitFor(row).toBeVisible().withTimeout(timeouts.HALF_MIN);
            const badge = ChannelListScreen.getChannelItemBadge(category, channel.name);
            await waitFor(badge).toExist().withTimeout(timeouts.TEN_SEC);
            await expect(badge).toBeVisible();
            await expect(badge).toHaveText(String(mentions));
        }
        /* eslint-enable no-await-in-loop */
    });

    it('MM-T510_3 - should surface the keyword post in Recent Mentions', async () => {
        // * Verify the keyword-triggered post is in the recipient's recent mentions. Only the
        // keyword post can appear here: Recent Mentions searches the user's mention keys and the
        // app deliberately excludes @channel/@all/@here from that search (UserModel.userMentionKeys),
        // and a DM without mention words matches no key.
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.toBeVisible();
        const {postListPostItem: keywordPostItem} = RecentMentionsScreen.getPostListPostItem(keywordPostId, keywordPostText);
        await waitFor(keywordPostItem).toExist().withTimeout(timeouts.HALF_MIN);
        await expect(keywordPostItem).toExist();
    });
});
