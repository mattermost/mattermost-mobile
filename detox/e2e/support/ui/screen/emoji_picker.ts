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

    open = async () => {
        // # Open emoji picker screen
        await PostOptionsScreen.pickReactionButton.tap();

        // Skin tone tooltip appears on the FIRST emoji picker open in a session (Android).
        // Always try to dismiss it: if present the X is tapped, if absent the catch is a no-op.
        // Defaulting closeToolTip=false previously caused failures when a test runs in
        // isolation (no prior test had already dismissed the tooltip), leaving the Modal in
        // the foreground and blocking Espresso from finding emoji_picker.screen.
        try {
            await waitFor(this.toolTipCloseButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await this.toolTipCloseButton.tap();
        } catch {
            // Tooltip did not appear — continue normally
        }

        return this.toBeVisible();
    };

    close = async () => {
        if (isIos()) {
            await this.emojiPickerScreen.swipe('down');
        } else {
            // First pressBack may dismiss the soft keyboard if it is still open
            // (e.g. after search interactions). A second pressBack is then needed
            // to actually close the emoji picker modal.
            await device.pressBack();
            try {
                await waitFor(this.emojiPickerScreen).not.toExist().withTimeout(timeouts.ONE_SEC);
            } catch {
                // Picker is still visible — keyboard was dismissed first; close the picker now
                await device.pressBack();
            }
        }
        await wait(timeouts.ONE_SEC);
        await expect(this.emojiPickerScreen).not.toBeVisible();
        await wait(timeouts.ONE_SEC);
    };
}

const emojiPickerScreen = new EmojiPickerScreen();
export default emojiPickerScreen;
