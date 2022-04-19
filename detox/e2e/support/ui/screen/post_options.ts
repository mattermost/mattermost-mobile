// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class PostOptionsScreen {
    testID = {
        reactionEmojiPrefix: 'post_options.reaction_bar.reaction.',
        postOptionsScreen: 'post_options.screen',
        pickReaction: 'post_options.reaction_bar.pick_reaction',
        replyPostOption: 'post_options.reply.post.option',
        copyLinkOption: 'post_options.copy.permalink.option',
        saveChannelOption: 'post_options.save.channel.option',
        unsaveChannelOption: 'post_options.unsave.channel.option',
        copyTextOption: 'post_options.copy.text.option',
        pinChannelOption: 'post_options.pin.channel.option',
        unpinChannelOption: 'post_options.unpin.channel.option',
        editPostOption: 'post_options.edit.post.option',
        deletePostOption: 'post_options.delete.post.option',
        followThreadOption: 'post_options.follow.thread.option',
        markUnreadOption: 'post_options.mark.unread.option',
    };

    postOptionsScreen = element(by.id(this.testID.postOptionsScreen));
    pickReaction = element(by.id(this.testID.pickReaction));
    replyPostOption = element(by.id(this.testID.replyPostOption));
    copyLinkOption = element(by.id(this.testID.copyLinkOption));
    saveChannelOption = element(by.id(this.testID.saveChannelOption));
    unsaveChannelOption = element(by.id(this.testID.unsaveChannelOption));
    copyTextOption = element(by.id(this.testID.copyTextOption));
    pinChannelOption = element(by.id(this.testID.pinChannelOption));
    unpinChannelOption = element(by.id(this.testID.unpinChannelOption));
    editPostOption = element(by.id(this.testID.editPostOption));
    deletePostOption = element(by.id(this.testID.deletePostOption));
    followThreadOption = element(by.id(this.testID.followThreadOption));
    markUnreadOption = element(by.id(this.testID.markUnreadOption));

    getReactionEmoji = (emojiName: string) => {
        return element(by.id(`${this.testID.reactionEmojiPrefix}${emojiName}`));
    };

    toBeVisible = async () => {
        await waitFor(this.postOptionsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return postOptionsScreen;
    };

    close = async () => {
        await this.postOptionsScreen.tap({x: 5, y: 10});
        await expect(this.postOptionsScreen).not.toBeVisible();
    };

    deletePost = async ({confirm = true} = {}) => {
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
            await expect(this.postOptionsScreen).not.toBeVisible();
        } else {
            await cancelButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.postOptionsScreen).toBeVisible();
            await this.close();
        }
    };
}

const postOptionsScreen = new PostOptionsScreen();
export default postOptionsScreen;
