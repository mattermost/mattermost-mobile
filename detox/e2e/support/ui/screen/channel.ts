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
import {dismissKnownModals} from '@support/ui/modal_dismiss';
import {
    ChannelListScreen,
    FindChannelsScreen,
    PostOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, longPressWithScrollRetry, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

import InteractiveDialogScreen from './interactive_dialog';

class ChannelScreen {
    testID = {
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
        scheduledPostOptionsBottomSheet: 'scheduled_post_options_bottom_sheet.screen',
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

    toBeVisible = async (timeout = isAndroid() ? timeouts.HALF_MIN : timeouts.TEN_SEC) => {
        await wait(timeouts.ONE_SEC);
        await waitForElementToExist(this.channelScreen, timeout);

        return this.channelScreen;
    };

    dismissScheduledPostTooltip = async () => {
        try {
            await waitFor(this.scheduledPostTooltipCloseButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
            await this.scheduledPostTooltipCloseButton.tap();
            await wait(timeouts.HALF_SEC);
        } catch {
            try {
                await waitFor(this.scheduledPostTooltipCloseButtonAdminAccount).toBeVisible().withTimeout(timeouts.FOUR_SEC);
                await this.scheduledPostTooltipCloseButtonAdminAccount.tap();
                await wait(timeouts.HALF_SEC);
            } catch {
                // Tooltip not visible.
            }
        }
    };

    open = async (category: string, channelName: any) => {
        // # Open channel screen
        await wait(timeouts.FOUR_SEC);
        const name = typeof channelName === 'string' ? channelName : String(channelName);
        if (category === 'channels') {
            await ChannelListScreen.tapSidebarPublicChannelDisplayName(name);
        } else {
            await ChannelListScreen.getChannelItemDisplayName(category, name).tap();
        }
        await this.dismissScheduledPostTooltip();
        return this.toBeVisible();
    };

    // For API-created private channels not yet in the sidebar.
    openViaFindChannels = async (channelName: string) => {
        await ChannelListScreen.toBeVisible();
        await FindChannelsScreen.open();
        await FindChannelsScreen.searchInput.replaceText(channelName);
        await FindChannelsScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);
        await waitForElementToBeVisible(
            FindChannelsScreen.getFilteredChannelItem(channelName),
            timeouts.HALF_MIN,
        );
        await FindChannelsScreen.getFilteredChannelItem(channelName).tap();
        await this.dismissScheduledPostTooltip();
        return this.toBeVisible();
    };

    back = async () => {
        await wait(isIos() ? timeouts.TWO_SEC : timeouts.ONE_SEC);
        await this.backButton.tap();
        await waitFor(this.channelScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
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

        await waitForElementToExist(postListPostItem, timeouts.HALF_MIN);

        if (isAndroid()) {
            try {
                await this.postList.getFlatList().swipe('up', 'fast', 0.3);
            } catch { /* ignore */ }
            await wait(timeouts.TWO_SEC);
        }

        if (isIos()) {
            // Dismiss soft keyboard if it is still up after postMessage. The keyboard
            // overlays the bottom half of the post list and prevents longPress from
            // hitting posts in a short channel. Tapping a non-input area of the
            // flat list dismisses it (mirrors the pattern in composePostDraft).
            try {
                await this.postList.getFlatList().tap({x: 5, y: 5});
                await wait(timeouts.HALF_SEC);
            } catch { /* ignore */ }
            try {
                await this.postList.getFlatList().swipe('up', 'fast', 0.3);
                await wait(timeouts.ONE_SEC);
            } catch { /* ignore */ }
        }

        const postTestID = `${this.testID.channelScreenPrefix}post_list.post.${postId}`;
        const longPressTarget = element(by.id(postTestID));

        await longPressWithScrollRetry(
            longPressTarget,
            this.postList.getFlatList(),
            PostOptionsScreen.postOptionsScreen,
        );
        await wait(timeouts.TWO_SEC);
    };

    openReplyThreadFor = async (postId: string, text: string) => {
        await this.openPostOptionsFor(postId, text);

        // # Open reply thread screen
        await PostOptionsScreen.replyPostOption.tap();
        await ThreadScreen.toBeVisible();
    };

    composePostDraft = async (message: string) => {
        await dismissKnownModals();

        await this.dismissScheduledPostTooltip();

        if (isIos()) {
            try {
                await waitFor(this.postList.getFlatList()).toExist().withTimeout(timeouts.ONE_SEC);
                await this.postList.getFlatList().tap({x: 5, y: 5});
                await wait(timeouts.HALF_SEC);
            } catch {
                // Channel intro has no post list yet.
            }
        }

        try {
            await this.postInput.tap();
        } catch {
            // replaceText below still focuses the field.
        }

        const replaceDeadline = Date.now() + timeouts.TEN_SEC;
        let lastError: unknown;
        /* eslint-disable no-await-in-loop -- retry on transient iOS occlusion */
        while (Date.now() < replaceDeadline) {
            try {
                await this.postInput.replaceText(message);
                lastError = undefined;
                break;
            } catch (e) {
                const msg = String(e);
                if (!msg.includes('hittable') && !msg.includes('not visible')) {
                    throw e;
                }
                lastError = e;
                await wait(timeouts.HALF_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */
        if (lastError) {
            throw lastError;
        }
    };

    postMessage = async (message: string) => {
        await this.composePostDraft(message);
        await this.tapSendButton();
        await wait(timeouts.TWO_SEC);
    };

    postSlashCommand = async (command: string) => {
        await this.composePostDraft(command);
        await waitForElementToBeVisible(this.sendButton, timeouts.FOUR_SEC);
        await this.sendButton.tap();
        await waitFor(InteractiveDialogScreen.interactiveDialogScreen).toExist().withTimeout(timeouts.FIVE_SEC);
    };

    tapSendButton = async () => {
        // Bump from 4s to 10s — on slow iOS CI runners the send button can fail
        // the visibility threshold for a few seconds while the keyboard finishes
        // animating up and the post draft layout settles.
        await waitForElementToBeVisible(this.sendButton, timeouts.TEN_SEC);
        await this.sendButton.tap();
        await waitFor(this.sendButton).not.toExist().withTimeout(timeouts.FIVE_SEC);
    };

    enterMessageToSchedule = async (message: string) => {
        await this.postInput.tap();
        await this.postInput.clearText();
        await this.postInput.replaceText(message);
    };

    longPressSendButton = async () => {
        await this.dismissScheduledPostTooltip();
        await waitForElementToBeVisible(this.sendButton, timeouts.FOUR_SEC);

        if (isAndroid()) {
            try {
                await this.postList.getFlatList().swipe('up', 'fast', 0.3);
            } catch { /* ignore */ }
            await wait(timeouts.ONE_SEC);
        }

        await device.disableSynchronization();
        try {
            await this.sendButton.longPress();

            await waitForElementToExist(
                element(by.id(this.testID.scheduledPostOptionsBottomSheet)),
                timeouts.HALF_MIN,
            );
        } finally {
            await device.enableSynchronization();
        }
    };

    hasPostMessage = async (postId: string, postMessage: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, postMessage);

        await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(postListPostItem).toBeVisible(50).withTimeout(timeouts.TEN_SEC);
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
        await waitForElementToExist(this.scheduleMessageTomorrowOption, timeouts.HALF_MIN);
        await this.scheduleMessageTomorrowOption.tap();
        await waitForElementToExist(this.scheduledPostOptionTomorrowSelected, timeouts.TEN_SEC);
    };

    scheduleMessageForMonday = async () => {
        await waitForElementToExist(this.scheduleMessageOnMondayOption, timeouts.HALF_MIN);
        await this.scheduleMessageOnMondayOption.tap();
        await waitForElementToExist(this.scheduledPostOptionMondaySelected, timeouts.TEN_SEC);
    };

    scheduleMessageForNextMonday = async () => {
        await waitForElementToExist(this.scheduledPostOptionNextMonday, timeouts.HALF_MIN);
        await this.scheduledPostOptionNextMonday.tap();
        await waitForElementToExist(this.scheduledPostOptionNextMondaySelected, timeouts.TEN_SEC);
    };

    // Monday uses Next Monday; other days use Monday.
    scheduleMessageForAvailableOption = async () => {
        const day = new Date().getDay();
        if (day === 1) {
            await this.scheduleMessageForNextMonday();
        } else {
            await this.scheduleMessageForMonday();
        }
    };

    clickOnScheduledMessage = async () => {
        await waitForElementToBeVisible(this.clickOnScheduledMessageButton, timeouts.TEN_SEC);
        await this.clickOnScheduledMessageButton.tap();
        await wait(timeouts.TWO_SEC);
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
            await wait(timeouts.TEN_SEC);
            await this.scheduleDraftInforMessage.tap();
        }
    };

    assertPostMessageEdited = async (
        postId: string,
        updatedMessage: string,
        locator: 'channel_page' | 'pinned_page' | 'thread_page' | 'search_page' | 'saved_messages_page' | 'recent_mentions_page' = 'channel_page',
    ) => {
        const locatorTestIDs = {
            channel_page: 'channel.post_list.post',
            pinned_page: 'pinned_messages.post_list.post',
            search_page: 'search_results.post_list.post',
            thread_page: 'thread.post_list.post',
            saved_messages_page: 'saved_messages.post_list.post',
            recent_mentions_page: 'recent_mentions.post_list.post',
        };

        await waitFor(element(by.id('edit_post.screen'))).
            not.toExist().
            withTimeout(timeouts.TEN_SEC);

        const postItemTestID = locatorTestIDs[locator];
        const postItemElement = `${postItemTestID}.${postId}`;
        const postItemMatcher = by.id(postItemElement);

        const escapedMessage = updatedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (isAndroid()) {
            const combinedPattern = new RegExp(`${escapedMessage}.*Edited`, 'is');
            const combinedMatcher = by.text(combinedPattern).withAncestor(postItemMatcher);
            await waitFor(element(combinedMatcher)).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            const completeTextPattern = new RegExp(`${escapedMessage}.*Edited`, 'i');
            const completeTextMatcher = by.text(completeTextPattern).withAncestor(postItemMatcher);
            await waitFor(element(completeTextMatcher)).toExist().withTimeout(timeouts.TEN_SEC);
        }
    };
}

const channelScreen = new ChannelScreen();
export default channelScreen;
