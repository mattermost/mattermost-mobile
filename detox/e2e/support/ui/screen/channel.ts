// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
    CameraQuickAction,
    FileQuickAction,
    ImageQuickAction,
    InputQuickAction,
    NavigationHeader,
    PostDraft,
    PostList,
    SendButton,
} from '@support/ui/component';
import {
    ChannelListScreen,
    PostOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class ChannelScreen {
    testID = {
        archievedCloseChannelButton: 'channel.post_draft.archived.close_channel.button',
        channelScreenPrefix: 'channel.',
        channelScreen: 'channel.screen',
        channelQuickActionsButton: 'channel_header.channel_quick_actions.button',
        favoriteQuickAction: 'channel.quick_actions.favorite.action',
        unfavoriteQuickAction: 'channel.quick_actions.unfavorite.action',
        muteQuickAction: 'channel.quick_actions.mute.action',
        unmuteQuickAction: 'channel.quick_actions.unmute.action',
        setHeaderQuickAction: 'channel.quick_actions.set_header.action',
        addMembersQuickAction: 'channel.quick_actions.add_members.action',
        copyChannelLinkQuickAction: 'channel.quick_actions.copy_channel_link.action',
        channelInfoQuickAction: 'channel.quick_actions.channel_info.action',
        leaveChannelQuickAction: 'channel.quick_actions.leave_channel.action',
        introDisplayName: 'channel_post_list.intro.display_name',
        introAddMembersAction: 'channel_post_list.intro_options.add_members.action',
        introSetHeaderAction: 'channel_post_list.intro_options.set_header.action',
        introFavoriteAction: 'channel_post_list.intro_options.favorite.action',
        introUnfavoriteAction: 'channel_post_list.intro_options.unfavorite.action',
        introChannelInfoAction: 'channel_post_list.intro_options.channel_info.action',
        toastMessage: 'toast.message',
        postPriorityPicker: 'channel.post_draft.quick_actions.post_priority_action',
        postPriorityImportantMessage: 'post_priority_picker_item.important',
        postPriorityUrgentMessage: 'post_priority_picker_item.urgent',
        postPriorityRequestAck: 'post_priority_picker_item.requested_ack.toggled.false.button',
        postPriorityPersistentNotification: 'post_priority_picker_item.persistent_notifications.toggled.undefined.button',
        scheduledPostTooltipCloseButton: 'scheduled_post.tooltip.close.button',
        scheduledPostTooltipCloseButtonAdminAccount: 'scheduled_post_tutorial_tooltip.close',
        scheduleMessageTomorrowOption: 'post_priority_picker_item.scheduledPostOptionTomorrow',
        scheduleMessageOnMondayOption: 'post_priority_picker_item.scheduledPostOptionMonday',
        scheduledPostOptionNextMonday: 'post_priority_picker_item.scheduledPostOptionNextMonday',
        scheduledPostOptionTomorrowSelected: 'post_priority_picker_item.scheduledPostOptionTomorrow.selected',
        scheduledPostOptionMondaySelected: 'post_priority_picker_item.scheduledPostOptionMonday.selected',
        scheduledPostOptionNextMondaySelected: 'post_priority_picker_item.scheduledPostOptionNextMonday.selected',
        clickOnScheduledMessageButton: 'scheduled_post_create_button',
        scheduledDraftInfoInChannel: 'scheduled_post_header.scheduled_post_indicator',
        scheduledDraftTooltipText: 'scheduled_post.tooltip.description',
    };

    scheduleDraftInforMessage = element(by.text('Type a message and long press the send button to schedule it for a later time.'));
    scheduledDraftTooltipText = element(by.id(this.testID.scheduledDraftTooltipText));
    scheduledDraftInfoInChannel = element(by.id(this.testID.scheduledDraftInfoInChannel));
    clickOnScheduledMessageButton = element(by.id(this.testID.clickOnScheduledMessageButton));
    scheduledPostOptionTomorrowSelected = element(by.id(this.testID.scheduledPostOptionTomorrowSelected));
    scheduledPostOptionMondaySelected = element(by.id(this.testID.scheduledPostOptionMondaySelected));
    scheduledPostOptionNextMonday = element(by.id(this.testID.scheduledPostOptionNextMonday));
    scheduledPostOptionNextMondaySelected = element(by.id(this.testID.scheduledPostOptionNextMondaySelected));
    scheduleMessageTomorrowOption = element(by.id(this.testID.scheduleMessageTomorrowOption));
    scheduleMessageOnMondayOption = element(by.id(this.testID.scheduleMessageOnMondayOption));
    scheduledPostTooltipCloseButton = element(by.id(this.testID.scheduledPostTooltipCloseButton));
    scheduledPostTooltipCloseButtonAdminAccount = element(by.id(this.testID.scheduledPostTooltipCloseButtonAdminAccount));
    postPriorityPersistentNotification = element(by.id(this.testID.postPriorityPersistentNotification));
    postPriorityUrgentMessage = element(by.id(this.testID.postPriorityUrgentMessage));
    postPriorityRequestAck = element(by.id(this.testID.postPriorityRequestAck));
    postPriorityImportantMessage = element(by.id(this.testID.postPriorityImportantMessage));
    postPriorityPicker = element(by.id(this.testID.postPriorityPicker));
    archievedCloseChannelButton = element(by.id(this.testID.archievedCloseChannelButton));
    channelScreen = element(by.id(this.testID.channelScreen));
    channelQuickActionsButton = element(by.id(this.testID.channelQuickActionsButton));
    favoriteQuickAction = element(by.id(this.testID.favoriteQuickAction));
    unfavoriteQuickAction = element(by.id(this.testID.unfavoriteQuickAction));
    muteQuickAction = element(by.id(this.testID.muteQuickAction));
    unmuteQuickAction = element(by.id(this.testID.unmuteQuickAction));
    setHeaderQuickAction = element(by.id(this.testID.setHeaderQuickAction));
    addMembersQuickAction = element(by.id(this.testID.addMembersQuickAction));
    copyChannelLinkQuickAction = element(by.id(this.testID.copyChannelLinkQuickAction));
    channelInfoQuickAction = element(by.id(this.testID.channelInfoQuickAction));
    leaveChannelQuickAction = element(by.id(this.testID.leaveChannelQuickAction));
    introDisplayName = element(by.id(this.testID.introDisplayName));
    introAddMembersAction = element(by.id(this.testID.introAddMembersAction));
    introSetHeaderAction = element(by.id(this.testID.introSetHeaderAction));
    introFavoriteAction = element(by.id(this.testID.introFavoriteAction));
    introUnfavoriteAction = element(by.id(this.testID.introUnfavoriteAction));
    introChannelInfoAction = element(by.id(this.testID.introChannelInfoAction));
    toastMessage = element(by.id(this.testID.toastMessage));
    applyPostPriority = element(by.text('Apply'));

    // convenience props
    backButton = NavigationHeader.backButton;
    headerTitle = NavigationHeader.headerTitle;
    atInputQuickAction = InputQuickAction.getAtInputQuickAction(this.testID.channelScreenPrefix);
    atInputQuickActionDisabled = InputQuickAction.getAtInputQuickActionDisabled(this.testID.channelScreenPrefix);
    slashInputQuickAction = InputQuickAction.getSlashInputQuickAction(this.testID.channelScreenPrefix);
    slashInputQuickActionDisabled = InputQuickAction.getSlashInputQuickActionDisabled(this.testID.channelScreenPrefix);
    fileQuickAction = FileQuickAction.getFileQuickAction(this.testID.channelScreenPrefix);
    fileQuickActionDisabled = FileQuickAction.getFileQuickActionDisabled(this.testID.channelScreenPrefix);
    imageQuickAction = ImageQuickAction.getImageQuickAction(this.testID.channelScreenPrefix);
    imageQuickActionDisabled = ImageQuickAction.getImageQuickActionDisabled(this.testID.channelScreenPrefix);
    cameraQuickAction = CameraQuickAction.getCameraQuickAction(this.testID.channelScreenPrefix);
    cameraQuickActionDisabled = CameraQuickAction.getCameraQuickActionDisabled(this.testID.channelScreenPrefix);
    postDraft = PostDraft.getPostDraft(this.testID.channelScreenPrefix);
    postDraftArchived = PostDraft.getPostDraftArchived(this.testID.channelScreenPrefix);
    postDraftArchivedCloseChannelButton = PostDraft.getPostDraftArchivedCloseChannelButton(this.testID.channelScreenPrefix);
    postDraftReadOnly = PostDraft.getPostDraftReadOnly(this.testID.channelScreenPrefix);
    postInput = PostDraft.getPostInput(this.testID.channelScreenPrefix);
    sendButton = SendButton.getSendButton(this.testID.channelScreenPrefix);
    sendButtonDisabled = SendButton.getSendButtonDisabled(this.testID.channelScreenPrefix);

    postList = new PostList(this.testID.channelScreenPrefix);

    getIntroOptionItemLabel = (introOptionItemTestId: string) => {
        return element(by.id(`${introOptionItemTestId}.label`));
    };

    getMoreMessagesButton = () => {
        return this.postList.getMoreMessagesButton();
    };

    getNewMessagesDivider = () => {
        return this.postList.getNewMessagesDivider();
    };

    getFlatPostList = () => {
        return this.postList.getFlatList();
    };

    getPostListPostItem = (postId: string, text = '', postProfileOptions: any = {}) => {
        return this.postList.getPost(postId, text, postProfileOptions);
    };

    getPostMessageAtIndex = (index: number) => {
        return this.postList.getPostMessageAtIndex(index);
    };

    toBeVisible = async () => {
        await wait(timeouts.ONE_SEC);
        await waitFor(this.channelScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelScreen;
    };

    open = async (categoryKey: string, channelName: string) => {
        // # Open channel screen
        await ChannelListScreen.getChannelItemDisplayName(categoryKey, channelName).tap();
        try {
            await this.scheduledPostTooltipCloseButton.tap();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('Element not visible, skipping click');
        }
        return this.toBeVisible();
    };

    back = async () => {
        await wait(timeouts.ONE_SEC);
        await this.backButton.tap();
        await expect(this.channelScreen).not.toBeVisible();
    };

    leaveChannel = async ({confirm = true} = {}) => {
        await waitFor(this.leaveChannelQuickAction).toExist().withTimeout(timeouts.TWO_SEC);
        await this.leaveChannelQuickAction.tap({x: 1, y: 1});
        const {
            leaveChannelTitle,
            cancelButton,
            leaveButton,
        } = Alert;
        await expect(leaveChannelTitle).toBeVisible();
        await expect(cancelButton).toBeVisible();
        await expect(leaveButton).toBeVisible();
        if (confirm) {
            await leaveButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelScreen).not.toExist();
        } else {
            await cancelButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.leaveChannelQuickAction).toExist();
        }
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);
        await expect(postListPostItem).toBeVisible();

        // # Open post options
        await postListPostItem.longPress(timeouts.TWO_SEC);
        await PostOptionsScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
    };

    openReplyThreadFor = async (postId: string, text: string) => {
        await this.openPostOptionsFor(postId, text);

        // # Open reply thread screen
        await PostOptionsScreen.replyPostOption.tap();
        await ThreadScreen.toBeVisible();
    };

    postMessage = async (message: string) => {
        // # Post message
        await this.postInput.tap();
        await this.postInput.clearText();
        await this.postInput.replaceText(message);
        await this.tapSendButton();
    };

    enterMessageToSchedule = async (message: string) => {
        await this.postInput.tap();
        await this.postInput.clearText();
        await this.postInput.replaceText(message);
    };

    tapSendButton = async () => {
        // # Tap send button
        await this.sendButton.tap();
        await expect(this.sendButton).not.toExist();
        await expect(this.sendButtonDisabled).toBeVisible();
    };

    longPressSendButton = async () => {
        // # Long press send button
        await this.sendButton.longPress();
    };

    hasPostMessage = async (postId: string, postMessage: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, postMessage);
        await expect(postListPostItem).toBeVisible();
    };

    hasPostMessageAtIndex = async (index: number, postMessage: string) => {
        await expect(
            this.getPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    };

    openPostPriorityPicker = async () => {
        await this.postPriorityPicker.tap();
    };

    clickPostPriorityImportantMessage = async () => {
        await this.postPriorityImportantMessage.tap();
    };

    clickPostPriorityUrgentMessage = async () => {
        await this.postPriorityUrgentMessage.tap();
    };

    toggleRequestAckPostpriority = async () => {
        await this.postPriorityRequestAck.tap();
    };

    togglePersistentNotificationPostpriority = async () => {
        await this.postPriorityPersistentNotification.tap();
    };

    applyPostPrioritySettings = async () => {
        await this.applyPostPriority.tap();
    };

    scheduleMessageForTomorrow = async () => {
        await this.scheduleMessageTomorrowOption.tap();
        await expect(this.scheduledPostOptionTomorrowSelected).toBeVisible();
    };

    scheduleMessageForMonday = async () => {
        await this.scheduleMessageOnMondayOption.tap();
        await expect(this.scheduledPostOptionMondaySelected).toBeVisible();
    };

    scheduleMessageForNextMonday = async () => {
        await this.scheduledPostOptionNextMonday.tap();
        await expect(this.scheduledPostOptionNextMondaySelected).toBeVisible();
    };

    clickOnScheduledMessage = async () => {
        await this.clickOnScheduledMessageButton.tap();
        await waitFor(this.clickOnScheduledMessageButton).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);
    };

    /*
    * Verify the message is scheduled and user can see Info in channel or thread
    * @param {boolean} thread - true if the message is scheduled in thread
    * @returns {Promise<void>}
    */
    verifyScheduledDraftInfoInChannel = async (thread = false) => {
        await expect(this.scheduledDraftInfoInChannel).toBeVisible();
        await expect(this.scheduledDraftInfoInChannel).toHaveText(`1 scheduled message in ${thread ? 'thread' : 'channel'}. See all.`);
    };

    closeScheduledMessageTooltip = async () => {
        if (isIos()) {
            await waitFor(this.scheduledDraftTooltipText).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await this.scheduledDraftTooltipText.tap();
        } else {
            // The page re-renders and then opens the tooltip again. Wait for the tooltip to be stable and then tap it.
            await wait(timeouts.TEN_SEC);
            await this.scheduleDraftInforMessage.tap();
        }
    };
}

const channelScreen = new ChannelScreen();
export default channelScreen;
