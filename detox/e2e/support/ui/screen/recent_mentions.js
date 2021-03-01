// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    PostOptions,
    SettingsSidebar,
} from '@support/ui/component';
import {SearchResultPostScreen} from '@support/ui/screen';

class RecentMentionsScreen {
    testID = {
        recentMentionsScreen: 'recent_mentions.screen',
        closeSettingsButton: 'close.settings.button',
    }

    recentMentionsScreen = element(by.id(this.testID.recentMentionsScreen));
    closeSettingsButton = element(by.id(this.testID.closeSettingsButton));

    getSearchResultPostItem = (postId, text) => {
        return SearchResultPostScreen.getPost(postId, text);
    }

    toBeVisible = async () => {
        await expect(this.recentMentionsScreen).toBeVisible();

        return this.recentMentionsScreen;
    }

    open = async () => {
        // # Open recent mentions screen
        await SettingsSidebar.recentMentionsAction.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await this.closeSettingsButton.tap();
        await expect(this.recentMentionsScreen).not.toBeVisible();
    }

    openPostOptionsFor = async (postId, text) => {
        const {searchResultPostItem} = await this.getSearchResultPostItem(postId, text);
        await expect(searchResultPostItem).toBeVisible();

        // # Open post options
        await searchResultPostItem.longPress();
        await PostOptions.toBeVisible();
    }
}

const recentMentionsScreen = new RecentMentionsScreen();
export default recentMentionsScreen;
