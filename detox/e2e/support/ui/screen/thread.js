// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CameraQuickAction,
    FileQuickAction,
    ImageQuickAction,
    InputQuickAction,
    PostDraft,
    PostList,
    PostOptions,
    SendButton,
} from '@support/ui/component';
import {LongPostScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';

class ThreadScreen {
    testID = {
        threadScreenPrefix: 'thread.',
        threadScreen: 'thread.screen',
        backButton: 'screen.back.button',
    }

    threadScreen = element(by.id(this.testID.threadScreen));
    backButton = element(by.id(this.testID.backButton));

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

    getLongPostItem = (postId, text) => {
        return LongPostScreen.getPost(postId, text);
    }

    getLongPostMessage = () => {
        return LongPostScreen.getPostMessage();
    }

    getPostListPostItem = (postId, text) => {
        return this.postList.getPost(postId, text);
    }

    getPostMessageAtIndex = (index) => {
        return this.postList.getPostMessageAtIndex(index);
    }

    toBeVisible = async () => {
        await wait(timeouts.HALF_SEC);
        await expect(this.threadScreen).toBeVisible();

        return this.threadScreen;
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.threadScreen).not.toBeVisible();
    }

    deletePost = async (postId, text, confirm = true, isParentPost = true) => {
        await this.openPostOptionsFor(postId, text);

        // # Delete post
        await PostOptions.deletePost(confirm);
        if (isParentPost) {
            await expect(this.threadScreen).not.toBeVisible();
        } else {
            this.toBeVisible();
        }
    }

    openPostOptionsFor = async (postId, text) => {
        const {postListPostItem} = await this.getPostListPostItem(postId, text);
        await expect(postListPostItem).toBeVisible();

        // # Open post options
        await postListPostItem.longPress();
        await PostOptions.toBeVisible();
    }

    postMessage = async (message) => {
        // # Post message
        await this.postInput.tap();
        await this.postInput.typeText(message);
        await this.tapSendButton();
    }

    tapSendButton = async () => {
        // # Tap send button
        await this.sendButton.tap();
        await expect(this.sendButton).not.toExist();
        await expect(this.sendButtonDisabled).toBeVisible();
    }

    hasLongPostMessage = async (postMessage) => {
        await expect(
            this.getLongPostMessage(),
        ).toHaveText(postMessage);
    }

    hasPostMessageAtIndex = async (index, postMessage) => {
        await expect(
            this.getPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    }
}

const threadScreen = new ThreadScreen();
export default threadScreen;
