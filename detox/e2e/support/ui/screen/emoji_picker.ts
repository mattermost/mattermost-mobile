// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {PostOptionsScreen} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class EmojiPickerScreen {
    testID = {
        emojiPickerScreenPrefix: 'emoji_picker.',
        emojiPickerScreen: 'emoji_picker.screen',
        closeButton: 'close.emoji_picker.button',
        toolTipCloseButton: 'skin_selector.tooltip.close.button',
    };

    emojiPickerScreen = element(by.id(this.testID.emojiPickerScreen));
    closeButton = element(by.id(this.testID.closeButton));
    toolTipCloseButton = element(by.id(this.testID.toolTipCloseButton));

    // convenience props
    searchBar = SearchBar.getSearchBar(this.testID.emojiPickerScreenPrefix);
    searchInput = SearchBar.getSearchInput(this.testID.emojiPickerScreenPrefix);
    cancelButton = SearchBar.getCancelButton(this.testID.emojiPickerScreenPrefix);
    clearButton = SearchBar.getClearButton(this.testID.emojiPickerScreenPrefix);

    toBeVisible = async () => {
        await waitFor(this.emojiPickerScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.emojiPickerScreen;
    };

    open = async (closeToolTip = false) => {
        // # Open emoji picker screen
        await PostOptionsScreen.pickReactionButton.tap();
        if (closeToolTip) {
            await wait(timeouts.ONE_SEC);
            await this.toolTipCloseButton.tap();
        }

        return this.toBeVisible();
    };

    close = async () => {
        if (isIos()) {
            await this.emojiPickerScreen.swipe('down');
        } else {
            await device.pressBack();
        }
        await wait(timeouts.ONE_SEC);
        await expect(this.emojiPickerScreen).not.toBeVisible();
        await wait(timeouts.ONE_SEC);
    };
}

const emojiPickerScreen = new EmojiPickerScreen();
export default emojiPickerScreen;
