// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {PostOptionsScreen} from '@support/ui/screen';
import {expect} from 'detox';

class EmojiPickerScreen {
    testID = {
        emojiPickerScreen: 'emoji_picker.screen',
        emojiPickerPrefix: 'emoji_picker.',
        closeButton: 'close.emoji_picker.button',
    };

    emojiPickerScreen = element(by.id(this.testID.emojiPickerScreen));
    closeButton = element(by.id(this.testID.closeButton));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.emojiPickerPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.emojiPickerPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.emojiPickerPrefix);
    clearButton = SearchBar.getClearButton(this.testID.emojiPickerPrefix);

    toBeVisible = async () => {
        await expect(this.emojiPickerScreen).toBeVisible();

        return this.emojiPickerScreen;
    };

    open = async () => {
        // # Open add reaction screen
        await PostOptionsScreen.pickReactionButton.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.emojiPickerScreen).not.toBeVisible();
    };
}

const emojiPickerScreen = new EmojiPickerScreen();
export default emojiPickerScreen;
