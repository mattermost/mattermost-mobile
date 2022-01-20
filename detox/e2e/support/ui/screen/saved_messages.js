// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    PostOptions,
    SettingsSidebar,
} from '@support/ui/component';
import {SearchResultPostScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';

class SavedMessagesScreen {
    testID = {
        savedMessagesScreen: 'saved_messages.screen',
        closeSettingsButton: 'close.settings.button',
    }

    savedMessagesScreen = element(by.id(this.testID.savedMessagesScreen));
    closeSettingsButton = element(by.id(this.testID.closeSettingsButton));

    getSearchResultPostItem = (postId, text, postProfileOptions = {}) => {
        return SearchResultPostScreen.getPost(postId, text, postProfileOptions);
    }

    toBeVisible = async () => {
        await waitFor(this.savedMessagesScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.savedMessagesScreen;
    }

    open = async () => {
        // # Open saved messages screen
        await SettingsSidebar.savedMessagesAction.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await this.closeSettingsButton.tap();
        await expect(this.savedMessagesScreen).not.toBeVisible();
    }

    openPostOptionsFor = async (postId, text) => {
        const {searchResultPostItem} = await this.getSearchResultPostItem(postId, text);
        await expect(searchResultPostItem).toBeVisible();

        // # Open post options
        await searchResultPostItem.longPress();
        await PostOptions.toBeVisible();
    }
}

const savedMessagesScreen = new SavedMessagesScreen();
export default savedMessagesScreen;
