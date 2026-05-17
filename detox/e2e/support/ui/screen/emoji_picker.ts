// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {PostOptionsScreen} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';

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
        // testID — that ID was never wired into the source. The picker's root
        // render is a fragment (see app/screens/emoji_picker/picker/picker.tsx)
        // and the wrapping BottomSheet uses the generic 'post_options' testID
        // shared with other bottom sheets. Verified locally on iOS 26 that
        // `emoji_picker.search_bar` ALSO isn't a real testID — react-native-elements'
        // SearchBar component receives `testID='emoji_picker.search_bar'` as a
        // prefix and only emits the leaf IDs `.search.input`, `.search.cancel.button`,
        // `.search.clear.button`. Wait on the `.search.input` (a leaf
        // TextInput, always rendered the moment the sheet mounts) — this
        // matches what's actually in the view hierarchy.
        await waitFor(this.searchInput).toExist().withTimeout(timeouts.TEN_SEC);

        return this.searchInput;
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
            // Swipe down on the search input — it's at the top of the sheet
            // content, and dragging it down dismisses the bottom-sheet
            // identically to dragging the sheet container.
            await this.searchInput.swipe('down');
        } else {
            // First pressBack may dismiss the soft keyboard if it is still open
            // (e.g. after search interactions). A second pressBack is then needed
            // to actually close the emoji picker modal.
            await device.pressBack();
            try {
                await waitFor(this.searchInput).not.toExist().withTimeout(timeouts.ONE_SEC);
            } catch {
                // Picker is still visible — keyboard was dismissed first; close the picker now
                await device.pressBack();
            }
        }
        await wait(timeouts.ONE_SEC);
        await waitFor(this.searchInput).not.toExist().withTimeout(timeouts.TEN_SEC);
        await wait(timeouts.ONE_SEC);
    };
}

const emojiPickerScreen = new EmojiPickerScreen();
export default emojiPickerScreen;
