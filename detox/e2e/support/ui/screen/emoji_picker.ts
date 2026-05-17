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
        // The emoji picker bottom sheet does NOT carry an `emoji_picker.screen`
        // testID — that testID was never wired into the source. The picker's
        // root render is a fragment (see app/screens/emoji_picker/picker/picker.tsx)
        // and the wrapping BottomSheet uses the generic 'post_options' testID,
        // shared with other bottom sheets. The picker's `emoji_picker.search_bar`
        // (rendered by PickerHeader the moment the sheet mounts) is unique and
        // a reliable readiness signal — observed in
        // android-results-cjyc1rgm4y-2's MM-T4990_3 testFnFailure.png where
        // the picker was fully rendered (emoji grid + search bar visible) but
        // the old `emoji_picker.screen` wait timed out at 10s.
        await waitFor(this.searchBar).toExist().withTimeout(timeouts.TEN_SEC);

        return this.searchBar;
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
            // The legacy `emoji_picker.screen` testID is absent (see
            // `toBeVisible` comment), so swipe down on the search bar itself —
            // it sits at the very top of the bottom-sheet content and works
            // identically to swiping the sheet container.
            await this.searchBar.swipe('down');
        } else {
            // First pressBack may dismiss the soft keyboard if it is still open
            // (e.g. after search interactions). A second pressBack is then needed
            // to actually close the emoji picker modal.
            await device.pressBack();
            try {
                await waitFor(this.searchBar).not.toExist().withTimeout(timeouts.ONE_SEC);
            } catch {
                // Picker is still visible — keyboard was dismissed first; close the picker now
                await device.pressBack();
            }
        }
        await wait(timeouts.ONE_SEC);
        await expect(this.searchBar).not.toBeVisible();
        await wait(timeouts.ONE_SEC);
    };
}

const emojiPickerScreen = new EmojiPickerScreen();
export default emojiPickerScreen;
