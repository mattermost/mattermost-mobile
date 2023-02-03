// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class PostOptionsScreen {
    testID = {
        reactionEmojiPrefix: 'post_options.reaction_bar.reaction.',
        postOptionsScreen: 'post_options.screen',
        pickReactionButton: 'post_options.reaction_bar.pick_reaction.button',
        replyPostOption: 'post_options.reply_post.option',
        followThreadOption: 'post_options.follow_thread.option',
        followingThreadOption: 'post_options.following_thread.option',
        markAsUnreadOption: 'post_options.mark_as_unread.option',
        copyLinkOption: 'post_options.copy_permalink.option',
        savePostOption: 'post_options.save_post.option',
        unsavePostOption: 'post_options.unsave_post.option',
        copyTextOption: 'post_options.copy_text.option',
        pinPostOption: 'post_options.pin_post.option',
        unpinPostOption: 'post_options.unpin_post.option',
        editPostOption: 'post_options.edit_post.option',
        deletePostOption: 'post_options.delete_post.option',
    };

    postOptionsScreen = element(by.id(this.testID.postOptionsScreen));
    pickReactionButton = element(by.id(this.testID.pickReactionButton));
    replyPostOption = element(by.id(this.testID.replyPostOption));
    followThreadOption = element(by.id(this.testID.followThreadOption));
    followingThreadOption = element(by.id(this.testID.followingThreadOption));
    markAsUnreadOption = element(by.id(this.testID.markAsUnreadOption));
    copyLinkOption = element(by.id(this.testID.copyLinkOption));
    savePostOption = element(by.id(this.testID.savePostOption));
    unsavePostOption = element(by.id(this.testID.unsavePostOption));
    copyTextOption = element(by.id(this.testID.copyTextOption));
    pinPostOption = element(by.id(this.testID.pinPostOption));
    unpinPostOption = element(by.id(this.testID.unpinPostOption));
    editPostOption = element(by.id(this.testID.editPostOption));
    deletePostOption = element(by.id(this.testID.deletePostOption));

    getReactionEmoji = (emojiName: string) => {
        return element(by.id(`${this.testID.reactionEmojiPrefix}${emojiName}`));
    };

    toBeVisible = async () => {
        await waitFor(this.postOptionsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return postOptionsScreen;
    };

    close = async () => {
        if (isIos()) {
            await this.postOptionsScreen.swipe('down');
        } else {
            await device.pressBack();
        }
        await wait(timeouts.ONE_SEC);
        await expect(this.postOptionsScreen).not.toBeVisible();
        await wait(timeouts.ONE_SEC);
    };

    deletePost = async ({confirm = true} = {}) => {
        await waitFor(this.deletePostOption).toExist().withTimeout(timeouts.TWO_SEC);
        await this.deletePostOption.tap({x: 1, y: 1});
        const {
            deletePostTitle,
            cancelButton,
            deleteButton,
        } = Alert;
        await expect(deletePostTitle).toBeVisible();
        await expect(cancelButton).toBeVisible();
        await expect(deleteButton).toBeVisible();
        if (confirm) {
            await deleteButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.postOptionsScreen).not.toExist();
        } else {
            await cancelButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.postOptionsScreen).toExist();
            await this.close();
        }
    };
}

const postOptionsScreen = new PostOptionsScreen();
export default postOptionsScreen;
