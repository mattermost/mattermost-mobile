// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    ChannelInfoScreen,
    SearchResultPostScreen,
} from '@support/ui/screen';

class PinnedMessagesScreen {
    testID = {
        pinnedMessagesScreen: 'pinned_messages.screen',
        backButton: 'screen.back.button',
    }

    pinnedMessagesScreen = element(by.id(this.testID.pinnedMessagesScreen));
    backButton = element(by.id(this.testID.backButton));

    getSearchResultPostItem = (postId, text) => {
        return SearchResultPostScreen.getPost(postId, text);
    }

    toBeVisible = async () => {
        await expect(this.pinnedMessagesScreen).toBeVisible();

        return this.pinnedMessagesScreen;
    }

    open = async () => {
        // # Open pinned messages screen
        await ChannelInfoScreen.pinnedMessagesAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.pinnedMessagesScreen).not.toBeVisible();
    }
}

const pinnedMessagesScreen = new PinnedMessagesScreen();
export default pinnedMessagesScreen;
