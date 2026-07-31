// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SearchBar} from '@support/ui/component';
import {PostOptionsScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';

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
        try {
            await waitFor(this.toolTipCloseButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await this.toolTipCloseButton.tap();
        } catch {
            // Skin-tone tooltip may not appear on every open.
        }

        const inputTimeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;
        await waitForElementToExist(this.searchInput, inputTimeout);
        if (isAndroid()) {
            await waitForElementToBeVisible(this.searchInput, inputTimeout);
        } else {
            await waitFor(this.searchInput).toBeVisible().withTimeout(inputTimeout);
        }

        return this.searchInput;
    };

    open = async () => {
        // # Open emoji picker screen
        await PostOptionsScreen.pickReactionButton.tap();
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
            // Swipe down on the search input to dismiss the bottom sheet. The input's
            // top ~2px is clipped by the safe-area/header overlap (view bounds {0,0,276,40}
            // vs visible {0,2,276,36}), so Detox's default down-swipe — which starts at
            // startY=0 (the clipped point) — fails with "not visible around point"
            // (SEC-11010). Start at the vertical center (startY=0.5), which is safely in
            // the visible area; a real finger swipes the middle too.
            await this.searchInput.swipe('down', 'fast', 0.5, 0.5, 0.5);
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

    tapSearchResultEmoji = async (glyph: string, emojiShortName?: string) => {
        // The filtered picker debounces a network search on each keystroke, so the app never reports
        // idle and synchronized waitFor/tap times out. Android matches the row text, not the testID.
        await device.disableSynchronization();
        try {
            const candidates: Detox.NativeMatcher[] = [];
            if (emojiShortName && isIos()) {
                candidates.push(by.id(`emoji_picker.search_result.${emojiShortName}`));
            }

            // Prefer the stable ":name:" text (what the row renders) over the raw glyph.
            const labels = emojiShortName ? [`:${emojiShortName}:`, glyph] : [glyph];
            const ancestors = [
                by.id('emoji_picker'),
                by.id(this.testID.emojiPickerScreen),
                by.id('custom_emoji_picker'),
            ];
            for (const label of labels) {
                for (const ancestor of ancestors) {
                    candidates.push(by.text(label).withAncestor(ancestor));
                }

                // Last resort: the ":name:" text is unique on the filtered results screen.
                candidates.push(by.text(label));
            }

            /* eslint-disable no-await-in-loop -- try each matcher until one is visible and taps */
            for (const matcher of candidates) {
                try {
                    const el = element(matcher).atIndex(0);
                    await waitForElementToBeVisible(el, timeouts.FIVE_SEC);
                    await el.tap();
                    return;
                } catch {
                    // Try the next matcher.
                }
            }
            /* eslint-enable no-await-in-loop */

            throw new Error(`tapSearchResultEmoji: could not tap ${glyph}`);
        } finally {
            await device.enableSynchronization();
        }
    };
}

const emojiPickerScreen = new EmojiPickerScreen();
export default emojiPickerScreen;
