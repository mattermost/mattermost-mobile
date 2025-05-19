// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CameraQuickAction,
    FileQuickAction,
    ImageQuickAction,
    InputQuickAction,
    PostDraft,
    PostList,
    SendButton,
} from '@support/ui/component';
import {PostOptionsScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class ThreadScreen {
    testID = {
        threadScreenPrefix: 'thread.',
        threadScreen: 'thread.screen',
        backButton: 'screen.back.button',
        followButton: 'thread.follow_thread.button',
        followingButton: 'thread.following_thread.button',
    };

    threadScreen = element(by.id(this.testID.threadScreen));
    backButton = element(by.id(this.testID.backButton));
    followButton = element(by.id(this.testID.followButton));
    followingButton = element(by.id(this.testID.followingButton));

    // convenience props
    atInputQuickAction = InputQuickAction.getAtInputQuickAction(this.testID.threadScreenPrefix);
    atInputQuickActionDisabled = InputQuickAction.getAtInputQuickActionDisabled(this.testID.threadScreenPrefix);
    slashInputQuickAction = InputQuickAction.getSlashInputQuickAction(this.testID.threadScreenPrefix);
    slashInputQuickActionDisabled = InputQuickAction.getSlashInputQuickActionDisabled(this.testID.threadScreenPrefix);
    fileQuickAction = FileQuickAction.getFileQuickAction(this.testID.threadScreenPrefix);
    fileQuickActionDisabled = FileQuickAction.getFileQuickActionDisabled(this.testID.threadScreenPrefix);
    imageQuickAction = ImageQuickAction.getImageQuickAction(this.testID.threadScreenPrefix);
    imageQuickActionDisabled = ImageQuickAction.getImageQuickActionDisabled(this.testID.threadScreenPrefix);
    cameraQuickAction = CameraQuickAction.getCameraQuickAction(this.testID.threadScreenPrefix);
    cameraQuickActionDisabled = CameraQuickAction.getCameraQuickActionDisabled(this.testID.threadScreenPrefix);
    postDraft = PostDraft.getPostDraft(this.testID.threadScreenPrefix);
    postDraftArchived = PostDraft.getPostDraftArchived(this.testID.threadScreenPrefix);
    postDraftReadOnly = PostDraft.getPostDraftReadOnly(this.testID.threadScreenPrefix);
    postInput = PostDraft.getPostInput(this.testID.threadScreenPrefix);
    sendButton = SendButton.getSendButton(this.testID.threadScreenPrefix);
    sendButtonDisabled = SendButton.getSendButtonDisabled(this.testID.threadScreenPrefix);

    postList = new PostList(this.testID.threadScreenPrefix);

    getThreadOverview = () => {
        return this.postList.getThreadOverview();
    };

    getThreadOverviewRepliesCount = () => {
        return this.postList.getThreadOverviewRepliesCount();
    };

    getThreadOverviewNoReplies = () => {
        return this.postList.getThreadOverviewNoReplies();
    };

    getThreadOverviewSaveButton = () => {
        return this.postList.getThreadOverviewSaveButton();
    };

    getThreadOverviewUnsaveButton = () => {
        return this.postList.getThreadOverviewUnsaveButton();
    };

    getThreadOverviewPostOptionsButton = () => {
        return this.postList.getThreadOverviewPostOptionsButton();
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
        await waitFor(this.threadScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.threadScreen;
    };

    back = async () => {
        await this.backButton.tap();
        await waitFor(this.threadScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    openPostOptionsFor = async (postId: string, text: string) => {
        const {postListPostItem} = this.getPostListPostItem(postId, text);
        await expect(postListPostItem).toBeVisible();

        // # Open post options
        await postListPostItem.longPress();
        await PostOptionsScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
    };

    postMessage = async (message: string) => {
        // # Post message
        await this.postInput.tap();
        await this.postInput.replaceText(message);
        await this.tapSendButton();
    };

    enterMessageToSchedule = async (message: string) => {
        await this.postInput.tap();
        await this.postInput.clearText();
        await this.postInput.replaceText(message);
    };

    longPressSendButton = async () => {
        // # Long press send button
        await this.sendButton.longPress();
    };

    tapSendButton = async () => {
        // # Tap send button
        await this.sendButton.tap();
        await expect(this.sendButton).not.toExist();
        await expect(this.sendButtonDisabled).toBeVisible();
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
}

const threadScreen = new ThreadScreen();
export default threadScreen;
