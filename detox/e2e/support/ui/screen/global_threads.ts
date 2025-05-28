// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NavigationHeader} from '@support/ui/component';
import {
    ChannelListScreen,
    ThreadOptionsScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class GlobalThreadsScreen {
    testID = {
        threadItemPrefix: 'global_threads.threads_list.thread_item.',
        globalThreadsScreen: 'global_threads.screen',
        headerAllThreadsButton: 'global_threads.threads_list.header.all.button',
        headerUnreadThreadsButton: 'global_threads.threads_list.header.unreads.button',
        headerUnreadDotBadge: 'global_threads.threads_list.header.unreads.badge',
        headerMarkAllAsReadButton: 'global_threads.threads_list.header.mark_all_as_read.button',
        emptyThreadsList: 'global_threads.threads_list.empty_state',
        flatThreadsList: 'global_threads.threads_list.flat_list',
    };

    globalThreadsScreen = element(by.id(this.testID.globalThreadsScreen));
    headerAllThreadsButton = element(by.id(this.testID.headerAllThreadsButton));
    headerUnreadThreadsButton = element(by.id(this.testID.headerUnreadThreadsButton));
    headerUnreadDotBadge = element(by.id(this.testID.headerUnreadDotBadge));
    headerMarkAllAsReadButton = element(by.id(this.testID.headerMarkAllAsReadButton));
    emptyThreadsList = element(by.id(this.testID.emptyThreadsList));
    flatThreadsList = element(by.id(this.testID.flatThreadsList));

    // convenience props
    backButton = NavigationHeader.backButton;

    getThreadItem = (threadId: string) => {
        return element(by.id(`${this.testID.threadItemPrefix}${threadId}`));
    };

    getThreadItemUnreadMentionsBadge = (threadId: string) => {
        return element(by.id(`${this.testID.threadItemPrefix}${threadId}.unread_mentions.badge`));
    };

    getThreadItemUnreadDotBadge = (threadId: string) => {
        return element(by.id(`${this.testID.threadItemPrefix}${threadId}.unread_dot.badge`));
    };

    getThreadItemThreadStarterUserDisplayName = (threadId: string) => {
        return element(by.id(`${this.testID.threadItemPrefix}${threadId}.thread_starter.user_display_name`));
    };

    getThreadItemThreadStarterChannelDisplayName = (threadId: string) => {
        return element(by.id(`${this.testID.threadItemPrefix}${threadId}.thread_starter.channel_display_name`));
    };

    getThreadItemFooterUnreadReplies = (threadId: string) => {
        return element(by.id(`${this.testID.threadItemPrefix}${threadId}.footer.unread_replies`));
    };

    getThreadItemFooterReplyCount = (threadId: string) => {
        return element(by.id(`${this.testID.threadItemPrefix}${threadId}.footer.reply_count`));
    };

    toBeVisible = async () => {
        await waitFor(this.globalThreadsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.globalThreadsScreen;
    };

    open = async () => {
        // # Open global threads screen
        await ChannelListScreen.threadsButton.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.globalThreadsScreen).not.toBeVisible();
    };

    openThreadOptionsFor = async (postId: string) => {
        const threadItem = this.getThreadItem(postId);
        await expect(threadItem).toBeVisible();

        // # Open thread options
        await threadItem.longPress();
        await ThreadOptionsScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);
    };
}

const globalThreadsScreen = new GlobalThreadsScreen();
export default globalThreadsScreen;
