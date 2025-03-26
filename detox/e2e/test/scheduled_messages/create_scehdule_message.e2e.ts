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
    ScheduleMessageScreen,
    LoginScreen,
    ServerScreen,
    DraftScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Messaging - At-Mention', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let testOtherUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        ({user: testOtherUser} = await User.apiCreateUser(siteOneUrl));
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, testOtherUser.id, testChannel.id);

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

    it('MM-T5762 should be able to create a scheduled message', async () => {
        // # Open a channel screen and post a message with lowercase at-mention
        const scheduledMessageText = 'Scheduled Message In a channel';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.scheduleMessage(scheduledMessageText);

        // # The bottom sheet info will not show `Tomorrow` if today is Friday or Saturday. Always schedule for Monday.
        await ChannelScreen.scheduleMessageForMonday();
        await ChannelScreen.clickOnScheduledMessage();

        await expect(element(by.text('Message scheduled for 9:00 AM. See all.'))).toBeVisible();

        // TODO: Verify the Channel message info

        await verifyScheduledCountOnChannelListScreen('1');

        // # Open scheduled message screen and verify count
        await ChannelListScreen.draftsButton.tap();
        await ScheduleMessageScreen.clickScheduledTab();
        await ScheduleMessageScreen.verifyCountOnScheduledTab('1');
        await ScheduleMessageScreen.scheduledMessageTooltipCloseButton.tap();
        await ScheduleMessageScreen.assertScheduledMessageExists(scheduledMessageText);

        await cleanupDrafts();
        await DraftScreen.backButton.tap();
    });

    it('MM-T5731 should be able to Delete a scheduled Message', async () => {
        // # Open a channel screen and post a message with lowercase at-mention
        const scheduledMessageText = 'Scheduled Message In a channel';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.scheduleMessage(scheduledMessageText);

        // # The bottom sheet info will not show `Tomorrow` if today is Friday or Saturday. Always schedule for Monday.
        await ChannelScreen.scheduleMessageForMonday();
        await ChannelScreen.clickOnScheduledMessage();

        await expect(element(by.text('Message scheduled for 9:00 AM. See all.'))).toBeVisible();

        // TODO: Verify the Channel message info

        await verifyScheduledCountOnChannelListScreen('1');

        // # Open scheduled message screen and verify count
        await ChannelListScreen.draftsButton.tap();
        await ScheduleMessageScreen.clickScheduledTab();
        await ScheduleMessageScreen.verifyCountOnScheduledTab('1');
        await ScheduleMessageScreen.assertScheduledMessageExists(scheduledMessageText);

        await DraftScreen.openDraftPostActions();
        await ScheduleMessageScreen.deleteScheduledMessageFromDraftActions();
        await DraftScreen.backButton.tap();

        // TODO: Back to Channel and Verify the Channel message info is not shown
    });

    it('MM-T5730 should be able to Send a scheduled Message', async () => {
        // # Open a channel screen and post a message with lowercase at-mention
        const scheduledMessageText = 'Scheduled Message In a channel';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.scheduleMessage(scheduledMessageText);

        // # The bottom sheet info will not show `Tomorrow` if today is Friday or Saturday. Always schedule for Monday.
        await ChannelScreen.scheduleMessageForMonday();
        await ChannelScreen.clickOnScheduledMessage();

        await expect(element(by.text('Message scheduled for 9:00 AM. See all.'))).toBeVisible();

        // TODO: Verify the Channel message info

        await verifyScheduledCountOnChannelListScreen('1');

        // # Open scheduled message screen and verify count
        await ChannelListScreen.draftsButton.tap();
        await ScheduleMessageScreen.clickScheduledTab();
        await ScheduleMessageScreen.verifyCountOnScheduledTab('1');
        await ScheduleMessageScreen.assertScheduledMessageExists(scheduledMessageText);

        await DraftScreen.openDraftPostActions();
        await DraftScreen.sendDraft();
        await DraftScreen.backButton.tap();

        // * Verify the scheduled message is  shown in the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, scheduledMessageText);
        await expect(postListPostItem).toBeVisible();

        // TODO: Back to Channel and Verify the Channel message info is not shown and Message
    });

    it('MM-T5720 should be able to Reschedule a scheduled Message', async () => {
        // # Open a channel screen and post a message with lowercase at-mention
        const scheduledMessageText = 'Scheduled Message In a channel';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.scheduleMessage(scheduledMessageText);

        // # The bottom sheet info will not show `Tomorrow` if today is Friday or Saturday. Always schedule for Monday.
        await ChannelScreen.scheduleMessageForMonday();
        await ChannelScreen.clickOnScheduledMessage();

        await expect(element(by.text('Message scheduled for 9:00 AM. See all.'))).toBeVisible();

        // TODO: Verify the Channel message info

        await verifyScheduledCountOnChannelListScreen('1');

        // # Open scheduled message screen and verify count
        await ChannelListScreen.draftsButton.tap();
        await ScheduleMessageScreen.clickScheduledTab();
        await ScheduleMessageScreen.verifyCountOnScheduledTab('1');
        await ScheduleMessageScreen.assertScheduledMessageExists(scheduledMessageText);

        await DraftScreen.openDraftPostActions();
        await ScheduleMessageScreen.clickRescheduleOption();
    });

    async function cleanupDrafts() {
        // # Clean up drafts
        await DraftScreen.openDraftPostActions();
        await ScheduleMessageScreen.deleteScheduledMessageFromDraftActions();
    }

    async function verifyScheduledCountOnChannelListScreen(draftCount: string) {
        await ChannelScreen.back();
        await ChannelListScreen.draftsButton.toBeVisible();
        await expect(element(by.id(ChannelListScreen.testID.scheduledMessageCountListScreen))).toHaveText(draftCount);
    }
});
