// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ThreadOptionsScreen {
    testID = {
        threadOptionsScreen: 'thread_options.screen',
        threadOptionsBackdrop: 'thread_options.backdrop',
        replyThreadOption: 'post_options.reply_post.option',
        followThreadOption: 'post_options.follow_thread.option',
        followingThreadOption: 'post_options.following_thread.option',
        openInChannelOption: 'thread_options.open_in_channel.option',
        markAsReadOption: 'thread_options.mark_as_unread.option',
        markAsUnreadOption: 'thread_options.mark_as_unread.option',
        saveThreadOption: 'post_options.save_post.option',
        unsaveThreadOption: 'post_options.unsave_post.option',
        copyLinkOption: 'post_options.copy_permalink.option',
    };

    threadOptionsScreen = element(by.id(this.testID.threadOptionsScreen));
    threadOptionsBackdrop = element(by.id(this.testID.threadOptionsBackdrop));
    replyThreadOption = element(by.id(this.testID.replyThreadOption));
    followThreadOption = element(by.id(this.testID.followThreadOption));
    followingThreadOption = element(by.id(this.testID.followingThreadOption));
    openInChannelOption = element(by.id(this.testID.openInChannelOption));
    markAsReadOption = element(by.id(this.testID.markAsUnreadOption));
    markAsUnreadOption = element(by.id(this.testID.markAsUnreadOption));
    saveThreadOption = element(by.id(this.testID.saveThreadOption));
    unsaveThreadOption = element(by.id(this.testID.unsaveThreadOption));
    copyLinkOption = element(by.id(this.testID.copyLinkOption));

    toBeVisible = async () => {
        await waitFor(this.threadOptionsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return threadOptionsScreen;
    };

    close = async () => {
        await this.threadOptionsBackdrop.tap({x: 5, y: 10});
        await expect(this.threadOptionsScreen).not.toBeVisible();
    };
}

const threadOptionsScreen = new ThreadOptionsScreen();
export default threadOptionsScreen;
