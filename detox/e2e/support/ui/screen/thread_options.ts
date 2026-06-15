// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class ThreadOptionsScreen {
    testID = {
        threadOptionsScreen: 'thread_options.screen',
        replyThreadOption: 'post_options.reply_post.option',
        followThreadOption: 'post_options.follow_thread.option',
        followingThreadOption: 'post_options.following_thread.option',
        openInChannelOption: 'thread_options.open_in_channel.option',
        markAsReadOption: 'thread_options.mark_as_read.option',
        markAsUnreadOption: 'thread_options.mark_as_unread.option',
        saveThreadOption: 'post_options.save_post.option',
        unsaveThreadOption: 'post_options.unsave_post.option',
        copyLinkOption: 'post_options.copy_permalink.option',
    };

    threadOptionsScreen = element(by.id(this.testID.threadOptionsScreen));
    replyThreadOption = element(by.id(this.testID.replyThreadOption));
    followThreadOption = element(by.id(this.testID.followThreadOption));
    followingThreadOption = element(by.id(this.testID.followingThreadOption));
    openInChannelOption = element(by.id(this.testID.openInChannelOption));
    markAsReadOption = element(by.id(this.testID.markAsReadOption));
    markAsUnreadOption = element(by.id(this.testID.markAsUnreadOption));
    saveThreadOption = element(by.id(this.testID.saveThreadOption));
    unsaveThreadOption = element(by.id(this.testID.unsaveThreadOption));
    copyLinkOption = element(by.id(this.testID.copyLinkOption));

    toBeVisible = async () => {
        await waitFor(this.threadOptionsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return threadOptionsScreen;
    };

    close = async () => {
        if (isIos()) {
            await this.threadOptionsScreen.swipe('down');
        } else {
            await device.pressBack();
        }
        await wait(timeouts.ONE_SEC);
        await expect(this.threadOptionsScreen).not.toBeVisible();
        await wait(timeouts.ONE_SEC);
    };
}

const threadOptionsScreen = new ThreadOptionsScreen();
export default threadOptionsScreen;
