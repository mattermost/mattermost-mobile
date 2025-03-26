// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, NavigationHeader} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

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

    draftTooltipCloseButton = {
        tap: async () => {
            await element(by.id(this.testID.draftTooltipCloseButton)).tap();
        },
    };

    openDraftPostActions = async () => {
        await this.draftPost.longPress();
    };

    swipeDraftPostLeft = async () => {
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
