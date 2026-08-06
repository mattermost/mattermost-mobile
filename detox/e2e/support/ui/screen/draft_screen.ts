// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, NavigationHeader} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class DraftScreen {
    testID = {
        editDraft: 'edit_draft',
        deleteDraft: 'delete_draft',
        draftMessageContent: 'draft_message',
        draftScreen: 'global_drafts_list',
        draftTooltipCloseButton: 'draft.tooltip.close.button',
        draftPost: 'draft_message',
        draftSendButton: 'send_draft_button',
        draftEmptyTitle: 'drafts.empty.title',
        requestACKIcon: 'drafts.requested_ack.icon',
        persistentNotificationIcon: 'drafts.persistent_notifications.icon',
    };

    // Prefer atIndex(0): iOS can match both the draft row and nested content.
    persistentNotificationIcon = element(by.id(this.testID.persistentNotificationIcon)).atIndex(0);
    requestACKIcon = element(by.id(this.testID.requestACKIcon)).atIndex(0);
    editDraft = element(by.id(this.testID.editDraft));
    backButton = NavigationHeader.backButton;
    draftScreen = element(by.id(this.testID.draftScreen));
    draftPost = element(by.id(this.testID.draftPost)).atIndex(0);
    draftSendButton = element(by.id(this.testID.draftSendButton));
    draftEmptyTitle = element(by.id(this.testID.draftEmptyTitle));
    deleteDraftSwipeAction = element(by.text('Delete draft'));
    draftMessageContent = element(by.id(this.testID.draftMessageContent)).atIndex(0);
    deleteDraft = element(by.id(this.testID.deleteDraft));

    draftTooltipCloseButton = {
        tap: async () => {
            await element(by.id(this.testID.draftTooltipCloseButton)).tap();
        },
    };

    dismissDraftTooltip = async () => {
        try {
            const close = element(by.id(this.testID.draftTooltipCloseButton));
            await waitFor(close).toExist().withTimeout(timeouts.FOUR_SEC);
            await close.tap();
            await waitFor(close).not.toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            // Tooltip already dismissed.
        }
    };

    openDraftPostActions = async () => {
        await this.dismissDraftTooltip();
        await waitFor(this.draftPost).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.draftPost.longPress();
    };

    swipeDraftPostLeft = async () => {
        await this.dismissDraftTooltip();
        await waitFor(this.draftPost).toBeVisible().withTimeout(timeouts.TEN_SEC);
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
