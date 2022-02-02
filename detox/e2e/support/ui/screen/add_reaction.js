// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    PostOptions,
    SearchBar,
} from '@support/ui/component';

class AddReactionScreen {
    testID = {
        addReactionScreen: 'add_reaction.screen',
        addReactionEmojiPickerPrefix: 'add_reaction.emoji_picker.',
        closeAddReactionButton: 'close.add_reaction.button',
    };

    addReactionScreen = element(by.id(this.testID.addReactionScreen));
    closeAddReactionButton = element(by.id(this.testID.closeAddReactionButton));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.addReactionEmojiPickerPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.addReactionEmojiPickerPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.addReactionEmojiPickerPrefix);
    clearButton = SearchBar.getClearButton(this.testID.addReactionEmojiPickerPrefix);

    toBeVisible = async () => {
        await expect(this.addReactionScreen).toBeVisible();

        return this.addReactionScreen;
    };

    open = async () => {
        // # Open add reaction screen
        await PostOptions.openAddReactionButton.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeAddReactionButton.tap();
        await expect(this.addReactionScreen).not.toBeVisible();
    };
}

const addReactionScreen = new AddReactionScreen();
export default addReactionScreen;
