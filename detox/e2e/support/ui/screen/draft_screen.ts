// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, NavigationHeader} from '@support/ui/component';
import {longPressWithScrollRetry, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class DraftScreen {
    testID = {
        editDraft: 'edit_draft',
        deleteDraft: 'delete_draft',
        draftMessageContent: 'draft_message',
        draftScreen: 'global_drafts_list',
        scheduledList: 'global_scheduled_post_list',
        draftTooltipCloseButton: 'draft.tooltip.close.button',

        // Long-press target is the Pressable wrapper (draft_post), not the
        // nested markdown body — body can sit under the nav/tab header on iOS.
        draftPost: 'draft_post',
        draftOptions: 'draft_options',
        draftSendButton: 'send_draft_button',
        draftEmptyTitle: 'drafts.empty.title',
        requestACKIcon: 'drafts.requested_ack.icon',
        persistentNotificationIcon: 'drafts.persistent_notifications.icon',
    };

    persistentNotificationIcon = element(by.id(this.testID.persistentNotificationIcon));
    requestACKIcon = element(by.id(this.testID.requestACKIcon));
    editDraft = element(by.id(this.testID.editDraft));
    backButton = NavigationHeader.backButton;
    draftScreen = element(by.id(this.testID.draftScreen));
    draftPost = element(by.id(this.testID.draftPost));
    draftSendButton = element(by.id(this.testID.draftSendButton));
    draftEmptyTitle = element(by.id(this.testID.draftEmptyTitle));
    deleteDraftSwipeAction = element(by.text('Delete draft'));
    draftMessageContent = element(by.id(this.testID.draftMessageContent));
    deleteDraft = element(by.id(this.testID.deleteDraft));

    // The drafts tutorial tooltip is shown once per app install, 300ms after the list
    // mounts. While it is up, react-native-walkthrough-tooltip renders a *second copy*
    // of the first row inside its modal (renderChildInTooltip), so `draft_post` matches
    // twice on iOS ("Multiple elements found") and on Android the modal overlay swallows
    // the long press so `draft_options` never opens. Settle it before touching a row.
    dismissTutorialTooltip = async () => {
        const closeButton = element(by.id(this.testID.draftTooltipCloseButton));
        try {
            await waitFor(closeButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
        } catch {
            // Tutorial already watched on this app install — nothing to dismiss.
            return;
        }
        await closeButton.tap();
        await waitFor(closeButton).not.toExist().withTimeout(timeouts.TEN_SEC);
    };

    draftTooltipCloseButton = {
        tap: async () => {
            await this.dismissTutorialTooltip();
        },
    };

    openDraftPostActions = async () => {
        await this.dismissTutorialTooltip();

        // Prefer scheduled list when on that tab; fall back to drafts list.
        let scrollMatcher = by.id(this.testID.scheduledList);
        try {
            await waitFor(element(scrollMatcher)).toExist().withTimeout(timeouts.ONE_SEC);
        } catch {
            scrollMatcher = by.id(this.testID.draftScreen);
        }
        await longPressWithScrollRetry(
            this.draftPost,
            scrollMatcher,
            element(by.id(this.testID.draftOptions)),
        );
    };

    swipeDraftPostLeft = async () => {
        await this.dismissTutorialTooltip();
        await this.draftPost.swipe('left');
    };

    deleteDraftPost = async (deleteAction: any) => {
        await expect(deleteAction).toBeVisible();
        await deleteAction.tap();
        await waitFor(Alert.deleteButton).toExist().withTimeout(timeouts.TEN_SEC);
        await Alert.deleteButton.tap();
    };

    deleteDraftPostFromSwipeActions = async () => {
        await this.deleteDraftPost(this.deleteDraftSwipeAction);
    };

    deleteDraftPostFromDraftActions = async () => {
        await this.deleteDraftPost(this.deleteDraft);
    };

    sendDraft = async () => {
        await this.draftSendButton.tap();
        await waitFor(Alert.sendButton).toExist().withTimeout(timeouts.TEN_SEC);
        await Alert.sendButton.tap();
    };

    editDraftPost = async () => {
        await this.editDraft.tap();
    };

    draftEmptyScreen = async () => {
        return this.draftEmptyTitle;
    };

    back = async () => {
        await wait(timeouts.ONE_SEC);
        await this.backButton.tap();
        expect(this.draftScreen).not.toBeVisible();
    };

    getDraftMessageContentText = async () => {
        await expect(this.draftMessageContent).toBeVisible();
        return this.draftMessageContent;
    };
}

const draftScreen = new DraftScreen();
export default draftScreen;
