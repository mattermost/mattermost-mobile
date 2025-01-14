// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import {SettingsScreen} from '@support/ui/screen';
// import {expect} from 'detox';

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
        draftPost: 'draft_post',
        draftSendButton: 'send_draft_button',
        draftEmptyTitle: 'drafts.empty.title',
    };

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

    deleteDraftPostFromSwipeActions = async () => {
        await expect(this.deleteDraftSwipeAction).toBeVisible();
        await this.deleteDraftSwipeAction.tap();
        await waitFor(Alert.deleteButton).toExist().withTimeout(timeouts.TEN_SEC);
        await Alert.deleteButton.tap();
    };

    deleteDraftPostFromDraftActions = async () => {
        await this.deleteDraft.tap();
        await waitFor(Alert.deleteButton).toExist().withTimeout(timeouts.TEN_SEC);
        await Alert.deleteButton.tap();
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
