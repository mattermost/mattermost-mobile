// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    DraftScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, isIos} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Message Draft', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        // * Verify on channel list screen
        await DraftScreen.backButton.tap();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('should be able to send the draft message from Draft screen', async () => {
        // # Open a channel screen and create a message draft
        const message = `Message ${getRandomId()}`;
        await openChannel(channelsCategory, testChannel);
        await createDraft(message, testChannel);
        await verifyDraftonChannelList('1');
        await ChannelListScreen.draftsButton.tap();
        await DraftScreen.draftTooltipCloseButton.tap();
        await DraftScreen.openDraftPostActions();
        await DraftScreen.sendDraft();
    });

    it('should be able to swipe left and delete a draft message', async () => {
        // # Open a channel screen and create a message draft
        const message = `Message ${getRandomId()}`;
        await openChannel(channelsCategory, testChannel);
        await createDraft(message, testChannel);
        await verifyDraftonChannelList('1');
        await ChannelListScreen.draftsButton.tap();
        await DraftScreen.swipeDraftPostLeft();
        await DraftScreen.deleteDraftPostFromSwipeActions();
    });

    it('should be able to delete a draft message from long press Draft actions', async () => {
        // # Open a channel screen and create a message draft
        const message = `Message ${getRandomId()}`;
        await openChannel(channelsCategory, testChannel);
        await createDraft(message, testChannel);
        await verifyDraftonChannelList('1');
        await ChannelListScreen.draftsButton.tap();
        await DraftScreen.openDraftPostActions();
        await DraftScreen.deleteDraftPostFromDraftActions();
    });

    it('should be able to Edit a draft message', async () => {
        // # Open a channel screen and create a message draft
        const FirstMessage = `Message ${getRandomId()}`;
        const SecondMessage = `Message ${getRandomId()}`;

        await openChannel(channelsCategory, testChannel);
        await createDraft(FirstMessage, testChannel);
        await verifyDraftonChannelList('1');
        await ChannelListScreen.draftsButton.tap();
        await DraftScreen.openDraftPostActions();
        await DraftScreen.editDraftPost();
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.postInput.replaceText(SecondMessage);
        await ChannelScreen.back();

        // # Verify the draft message is updated
        await expect(element(by.text(SecondMessage))).toBeVisible();
        await DraftScreen.openDraftPostActions();
        await DraftScreen.deleteDraftPostFromDraftActions();
    });

    it('should be able to verify drafts tab shows message priority "Important" and request acknowledgement', async () => {
        // # Open a channel screen and create a message draft
        const message = `Message ${getRandomId()}`;

        await openChannel(channelsCategory, testChannel);
        await createDraft(message, testChannel);

        await element(by.id('channel.post_draft.quick_actions.post_priority_action')).tap();
        await element(by.id('post_priority_picker_item.important')).tap();
        await element(by.id('post_priority_picker_item.requested_ack.toggled.false.requested_ack')).tap();
        await element(by.text('Apply')).tap();
        await verifyDraftonChannelList('1');
        await ChannelListScreen.draftsButton.tap();
        await expect(element(by.id('drafts.requested_ack.icon'))).toBeVisible();
    });

    it('should be able to verify drafts tab shows message priority "Urgent" and persistent notification', async () => {
        // # Open a channel screen and create a message draft
        const message = `Message ${getRandomId()}`;

        await openChannel(channelsCategory, testChannel);
        await createDraft(message, testChannel);

        await element(by.id('channel.post_draft.quick_actions.post_priority_action')).tap();
        await element(by.id('post_priority_picker_item.urgent')).tap();
        await element(by.id('post_priority_picker_item.persistent_notifications.toggled.undefined.persistent_notifications')).tap();
        await element(by.text('Apply')).tap();
        await verifyDraftonChannelList('1');
        await ChannelListScreen.draftsButton.tap();
        await expect(element(by.id('drafts.persistent_notifications.icon'))).toBeVisible();
    });
});

async function openChannel(channelsCategory: string, testChannel: any) {
    await ChannelListScreen.draftsButton.toNotBeVisible();
    await ChannelScreen.open(channelsCategory, testChannel.name);
}

async function createDraft(message: string, testChannel: any): Promise<void> {
    await ChannelScreen.postInput.tap();
    await ChannelScreen.postInput.replaceText(message);

    // * Verify message exists in post draft and is not yet added to post list
    if (isIos()) {
        await expect(ChannelScreen.postInput).toHaveValue(message);
    } else {
        await expect(ChannelScreen.postInput).toHaveText(message);
    }
    const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
    const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
    await expect(postListPostItem).not.toExist();
}

async function verifyDraftonChannelList(draftCount: string) {
    await ChannelScreen.back();
    await ChannelListScreen.draftsButton.toBeVisible();
    await expect(element(by.id(ChannelListScreen.testID.draftCountListScreen))).toHaveText(draftCount);
}
