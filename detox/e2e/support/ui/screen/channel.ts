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
    FindChannelsScreen,
    PostOptionsScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, longPressWithScrollRetry, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

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
    tildeInputQuickAction = InputQuickAction.getTildeInputQuickAction(this.testID.channelScreenPrefix);
    tildeInputQuickActionDisabled = InputQuickAction.getTildeInputQuickActionDisabled(this.testID.channelScreenPrefix);
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

        // Use polling waitForElementToExist on both platforms to avoid bridge-idle sync stalls.
        // On Android, channel navigation (DM/GM creation, Browse Channels tap) keeps the JS
        // bridge (mqt_js) busy. On iOS, navigating from Browse Channels to a channel
        // (especially archived channels) triggers concurrent modal dismissal + channel push +
        // network fetches that keep the bridge busy, causing waitFor().toExist() to block for
        // the full timeout waiting for bridge-idle that never arrives within 30s.
        await waitForElementToExist(this.channelScreen, timeout);

        return this.channelScreen;
    };

    dismissScheduledPostTooltip = async () => {
        // Try to close scheduled post tooltip if it exists (try both regular and admin account versions).
        try {
            await waitFor(this.scheduledPostTooltipCloseButton).toBeVisible().withTimeout(timeouts.FOUR_SEC);
            await this.scheduledPostTooltipCloseButton.tap();
            await wait(timeouts.HALF_SEC);
        } catch {
            // Try admin account version
            try {
                await waitFor(this.scheduledPostTooltipCloseButtonAdminAccount).toBeVisible().withTimeout(timeouts.FOUR_SEC);
                await this.scheduledPostTooltipCloseButtonAdminAccount.tap();
                await wait(timeouts.HALF_SEC);
            } catch {
                // Tooltip not visible, continue
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

    /**
     * Open a channel via Find Channels. Use for API-created private channels that may
     * not appear in the sidebar immediately after login or between tests.
     */
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

        if (isAndroid()) {
            await waitFor(this.channelScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        } else {
            await expect(this.channelScreen).not.toBeVisible();
        }
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

        // Poll for the post to exist in the hierarchy (not necessarily meeting the
        // 75% visibility threshold). On iOS 26.x the most recent post often sits
        // behind the post-input bar or under a transient keyboard, so toBeVisible()
        // fails even though the post is present and will become hittable after the
        // scroll-up on line ~252. Polling toExist() is sufficient — the subsequent
        // longPressWithScrollRetry handles visibility on its own via scroll retries.
        await waitForElementToExist(postListPostItem, timeouts.HALF_MIN);

        // On Android, dismiss the keyboard before long-pressing. The soft keyboard
        // stays open after postMessage() and intercepts the long-press gesture on
        // API 35 — the post options bottom sheet never appears because Android's
        // gesture system routes the touch to the keyboard's window instead of the
        // post list. A swipe gesture on the post list triggers keyboardDismissMode
        // 'on-drag' which reliably dismisses the keyboard. Detox's scroll() API
        // may use programmatic scrolling that doesn't trigger on-drag dismissal,
        // whereas swipe() performs a real touch gesture.
        if (isAndroid()) {
            try {
                await this.postList.getFlatList().swipe('up', 'fast', 0.3);
            } catch { /* ignore — list may be too short */ }
            await wait(timeouts.TWO_SEC);
        }

        // On iOS, the most-recent post can sit right at the bottom edge of the list,
        // partially covered by the post-input bar. Its "hittable point" (the centre)
        // lies behind the input, making long-press throw "View is not hittable at its
        // visible point". Scroll the list up slightly to push the post away from the
        // input area so the gesture lands cleanly.
        if (isIos()) {
            try {
                await this.postList.getFlatList().scroll(100, 'up');
                await wait(timeouts.ONE_SEC);
            } catch { /* ignore — list may be at the boundary */ }
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

    postMessage = async (message: string) => {
        // # Post message
        //
        // Precondition: the channel screen must actually be the topmost screen
        // before we touch postInput. Empirical analysis of CI run 25947506060
        // showed many "View is not hittable" failures at this exact site were
        // actually state-contamination from a prior test that left a modal open
        // (e.g. Edit Channel Header). The postInput element is still discoverable
        // by testID because the channel screen stays mounted underneath, but
        // every interaction fails because the modal intercepts touches. We
        // dismiss any known leftover modal once before falling through to the
        // normal post flow. Cheap on the common (no-modal) path: a single
        // 600 ms exists-probe per close button id, short-circuited at the first
        // hit.
        try {
            const knownCloseIds = [
                'close.create_or_edit_channel.button',
                'close.channel_info.button',
                'close.channel_add_members.button',
                'close.channel_bookmark.button',
                'close.edit_post.button',
                'close.edit_profile.button',
                'close.find_channels.button',
                'close.browse_channels.button',
                'close.settings.button',
                'close.create_direct_message.button',
                'close.custom_status.button',
            ];
            /* eslint-disable no-await-in-loop -- short-circuit at first match */
            for (const closeId of knownCloseIds) {
                const btn = element(by.id(closeId));
                try {
                    await waitFor(btn).toExist().withTimeout(timeouts.HALF_SEC);
                    await btn.tap();
                    await wait(timeouts.ONE_SEC);
                    break;
                } catch { /* not this modal */ }
            }
            /* eslint-enable no-await-in-loop */
        } catch {
            // Best-effort recovery. Fall through.
        }

        // On iOS the PasteInputTextView can fail Detox's 100% visibility threshold
        // when the channel intro header pushes the input below the visible area or
        // a tooltip overlay partially covers it. Dismiss any tooltip overlay first,
        // then tap the input.
        await this.dismissScheduledPostTooltip();

        // On iOS 26, the keyboard can persist across channel navigation if the
        // KeyboardController inset isn't properly reset between tests. When the
        // keyboard is showing, the post input bar shifts behind it, making the
        // PasteInputTextView fail hittability at {5,6}. Tapping the post list
        // (above the keyboard) dismisses it so the subsequent tap on postInput
        // gets the correct keyboard-aware layout.
        // Guard with a short waitFor so we don't hang 60s if FlatList is absent
        // (e.g. empty channel with intro view in place of a post list).
        if (isIos()) {
            try {
                await waitFor(this.postList.getFlatList()).toExist().withTimeout(timeouts.ONE_SEC);

                // Use a fixed top-corner coordinate instead of the default center
                // tap. On a freshly opened channel with no posts, the FlatList's
                // center sits exactly on the IntroOptions row (Set Header / Add
                // Members / Favorite — see
                // app/screens/channel/channel_post_list/intro/options/index.tsx).
                // A default `.tap()` lands on `SetHeaderBox`, opens the Edit
                // Channel Header modal, and the subsequent `postInput.tap()`
                // then fails its 100% visibility check because the modal is
                // sitting on top — symptom: PasteInput "not visible" with
                // bounds 400x32. Tapping at (5,5) keeps us in the FlatList's
                // top padding (channel-intro illustration / banner area) which
                // has no touchables to accidentally trigger.
                await this.postList.getFlatList().tap({x: 5, y: 5});
                await wait(timeouts.HALF_SEC);
            } catch {
                // FlatList not present (channel intro) — no keyboard to dismiss.
            }
        }

        try {
            await this.postInput.tap();
        } catch {
            // Input not hittable (intro header covering it on iOS) — replaceText
            // will still work and focus the field.
        }

        // Poll for hittability on the post input.
        //
        // On iOS the PasteInputTextView gets briefly occluded by the channel-intro
        // header, the scheduled-post tooltip, an in-flight UITransitionView from
        // the RNN-style navigation transition, or a keyboard inset that hasn't
        // settled yet. The previous "single retry after a 1 s wait" was racing all
        // of these on the slow macos-15 / iOS 26 CI runners (35 failures/run at
        // this exact site). A bounded polling loop with a hittability probe per
        // iteration lets the transient overlays clear without giving up too soon.
        //
        // Total budget is timeouts.TEN_SEC. Each iteration calls replaceText() and
        // returns immediately on success; a hittability rejection is caught,
        // a short wait amortises one frame + transition, and we retry. Any other
        // failure (e.g. element not found) is re-thrown immediately so we don't
        // mask real regressions.
        const replaceDeadline = Date.now() + timeouts.TEN_SEC;
        let lastError: unknown;
        /* eslint-disable no-await-in-loop -- sequential retry on transient occlusion */
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

        await this.tapSendButton();
        await wait(timeouts.TWO_SEC);
    };

    enterMessageToSchedule = async (message: string) => {
        await this.postInput.tap();
        await this.postInput.clearText();
        await this.postInput.replaceText(message);
    };

    tapSendButton = async () => {
        // # wait for Send button to be enabled
        await waitFor(this.sendButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await this.sendButton.tap();
        await waitFor(this.sendButton).not.toExist().withTimeout(timeouts.FIVE_SEC);
    };

    longPressSendButton = async () => {
        // # Dismiss the scheduled-post tooltip before long-pressing the send button.
        // On Android the tooltip overlay intercepts the long-press gesture, preventing
        // the scheduling sheet from opening. Dismissing it first ensures the press lands
        // on the actual send button element.
        await this.dismissScheduledPostTooltip();

        // # Wait for the send button to be visible before attempting the long press.
        // enterMessageToSchedule calls replaceText() which may not have triggered the
        // React state update that renders the send button by the time we get here.
        // Use polling (waitForElementToBeVisible) instead of waitFor().toBeVisible()
        // so the wait does not depend on bridge-idle sync, which is permanently busy
        // on both iOS 26.x (main run loop) and Android API 35 (JS bridge after input).
        await waitForElementToBeVisible(this.sendButton, timeouts.FOUR_SEC);

        // # On Android, the soft keyboard stays open after replaceText(). Swipe the
        // post list to trigger keyboardDismissMode='on-drag' and dismiss the keyboard
        // BEFORE disabling sync. With sync disabled the gesture system is unrestricted,
        // so the long-press must land on the actual send button — the keyboard must be
        // gone by then or it will intercept the press.
        if (isAndroid()) {
            try {
                await this.postList.getFlatList().swipe('up', 'fast', 0.3);
            } catch { /* ignore — post list may be too short to scroll */ }
            await wait(timeouts.ONE_SEC);
        }

        // # Disable Detox synchronization before the long press. On iOS 26 the main
        // run loop never fully idles (the "Main Run Loop is awake" sync blocker),
        // causing waitFor-based matchers and even longPress() to hang for 30s before
        // timing out. On Android the JS bridge (mqt_js) stays busy after text input,
        // producing the same effect. Disabling sync lets the gesture dispatch
        // immediately; we then poll for the bottom sheet with waitForElementToExist.
        await device.disableSynchronization();
        try {
            await this.sendButton.longPress();

            // Wait for the schedule picker bottom sheet to appear using polling
            // (does not depend on Detox idle-sync).
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

        // Use 50% threshold: on iOS 26.x the message input bar can clip the bottom
        // post to ~50–74% visible, causing the default 75% check to fail intermittently.
        await expect(postListPostItem).toBeVisible(50);
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
        // Use polling helper instead of waitFor().toExist() — the latter depends on
        // Detox idle-sync which can block on both iOS (main run loop) and Android
        // (JS bridge busy). Polling checks the hierarchy directly.
        await waitForElementToExist(this.scheduleMessageTomorrowOption, timeouts.HALF_MIN);
        await this.scheduleMessageTomorrowOption.tap();
        await waitForElementToExist(this.scheduledPostOptionTomorrowSelected, timeouts.TEN_SEC);
    };

    scheduleMessageForMonday = async () => {
        // Use polling helper — see scheduleMessageForTomorrow for rationale.
        await waitForElementToExist(this.scheduleMessageOnMondayOption, timeouts.HALF_MIN);
        await this.scheduleMessageOnMondayOption.tap();
        await waitForElementToExist(this.scheduledPostOptionMondaySelected, timeouts.TEN_SEC);
    };

    scheduleMessageForNextMonday = async () => {
        // Use polling helper — see scheduleMessageForTomorrow for rationale.
        await waitForElementToExist(this.scheduledPostOptionNextMonday, timeouts.HALF_MIN);
        await this.scheduledPostOptionNextMonday.tap();
        await waitForElementToExist(this.scheduledPostOptionNextMondaySelected, timeouts.TEN_SEC);
    };

    /**
     * Picks the first available schedule option regardless of the current day.
     *
     * The picker shows different options depending on the day of the week:
     *   Sunday  (0): Monday (stable fallback)
     *   Monday  (1): Next Monday
     *   Tue–Thu (2–4): Monday (stable fallback)
     *   Friday  (5): Monday
     *   Saturday(6): Monday
     *
     * "Tomorrow" is intentionally skipped as a stable fallback — Monday is
     * reliably present on all non-Monday weekdays and Sunday, so tests pass
     * on any day without relying on "Tomorrow" label availability.
     * Uses new Date().getDay() which returns 0–6 (Sunday–Saturday) regardless
     * of locale.
     */
    scheduleMessageForAvailableOption = async () => {
        const day = new Date().getDay(); // 0 = Sunday … 6 = Saturday
        if (day === 1) {
            // Monday: "Tomorrow" and "Next Monday" are available; pick "Next Monday"
            await this.scheduleMessageForNextMonday();
        } else {
            // Sunday, Tue–Sat: "Monday" is always a valid and stable choice
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
            // The page re-renders and then opens the tooltip again. Wait for the tooltip to be stable and then tap it.
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

        // Wait for the Edit Message modal to close before asserting on the underlying page.
        // After EditPostScreen.saveButton.tap() the modal dismiss can lag a frame or two
        // (RNN screen-replace race), so a one-shot assertion below races the underlying
        // post item that is still occluded by the edit modal.
        await waitFor(element(by.id('edit_post.screen'))).
            not.toExist().
            withTimeout(timeouts.TEN_SEC);

        const postItemTestID = locatorTestIDs[locator];
        const postItemElement = `${postItemTestID}.${postId}`;
        const postItemMatcher = by.id(postItemElement);

        // Escape special characters in the message for regex
        const escapedMessage = updatedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (isAndroid()) {
            const combinedPattern = new RegExp(`${escapedMessage}.*Edited`, 'is');
            const combinedMatcher = by.text(combinedPattern).withAncestor(postItemMatcher);
            await waitFor(element(combinedMatcher)).toExist().withTimeout(timeouts.TEN_SEC);
        } else {
            // On iOS, nested <Text> components share a single UITextView text container,
            // so the combined regex matches both the message body and "Edited" in one view.
            const completeTextPattern = new RegExp(`${escapedMessage}.*Edited`, 'i');
            const completeTextMatcher = by.text(completeTextPattern).withAncestor(postItemMatcher);
            await waitFor(element(completeTextMatcher)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        }
    };
}

const channelScreen = new ChannelScreen();
export default channelScreen;
