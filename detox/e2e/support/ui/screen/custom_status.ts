// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    AccountScreen,
    EmojiPickerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class CustomStatusScreen {
    testID = {
        customStatusEmojiPrefix: 'custom_status.custom_status_emoji.',
        customStatusDurationPrefix: 'custom_status.clear_after.custom_status_duration.',
        customStatusSuggestionPrefix: 'custom_status.custom_status_suggestion.',
        customStatusScreen: 'custom_status.screen',
        doneButton: 'custom_status.done.button',
        scrollView: 'custom_status.scroll_view',
        statusInput: 'custom_status.status.input',
        statusInputClearButton: 'custom_status.status.input.clear.button',
        recents: 'custom_status.recents',
        suggestions: 'custom_status.suggestions',
    };

    customStatusScreen = element(by.id(this.testID.customStatusScreen));
    doneButton = element(by.id(this.testID.doneButton));
    scrollView = element(by.id(this.testID.scrollView));
    statusInput = element(by.id(this.testID.statusInput));
    statusInputClearButton = element(by.id(this.testID.statusInputClearButton));
    recents = element(by.id(this.testID.recents));
    suggestions = element(by.id(this.testID.suggestions));

    getCustomStatusEmoji = (emojiName: string) => {
        return element(by.id(`${this.testID.customStatusEmojiPrefix}${emojiName}`));
    };

    getCustomStatusClearAfterAction = (duration: string) => {
        return element(by.id(`${this.testID.customStatusDurationPrefix}${duration}.action`));
    };

    getCustomStatusExpiry = (duration: string) => {
        return element(by.id(`${this.testID.customStatusDurationPrefix}${duration}.custom_status_expiry`));
    };

    getCustomStatusSuggestion = (_blockMatcher: Detox.NativeMatcher, emojiName: string, text: string, duration: string) => {
        // The original page object chained `.withAncestor(blockMatcher)` to
        // disambiguate the same item appearing in the recents block vs the
        // suggestions block (both wrappers' children carry the same
        // `custom_status.custom_status_suggestion.<text>` testID).
        // On iOS 26 that traversal is broken: Detox cannot resolve an
        // ancestor that is a non-touchable container View — the
        // `custom_status.suggestions` / `custom_status.recents` wrappers
        // report `hittable: false, visible: false` from
        // `getAttributes()` and the matcher returns "No elements found"
        // even for items that are demonstrably in the tree. Verified
        // locally: with `withAncestor` restored, MM-T4990_1's
        // `verifyAllSuggestedStatuses` (per-item assertions) fails;
        // without it, MM-T4990_1 passes but MM-T4990_2's
        // `expect(suggestion).not.toExist()` matches the recent.
        //
        // TODO: pick one of these to close the trade-off properly —
        //   (a) source change in
        //       `app/screens/custom_status/components/custom_status_suggestion/custom_status_suggestion.tsx`
        //       to accept an optional `testIdPrefix` so suggestions and
        //       recents render distinct testIDs, then drop the ancestor
        //       constraint here completely; or
        //   (b) refactor the per-item matchers to combine the outer item
        //       ID with the recents' `clear.button` testID
        //       (recents-only) for disambiguation.
        // Argument kept with `_` prefix for call-site compatibility.
        const customStatusSuggestionTestId = `${this.testID.customStatusSuggestionPrefix}${text}`;
        const customStatusSuggestionMatcher = by.id(customStatusSuggestionTestId);
        const customStatusEmojiMatcher = by.id(`${customStatusSuggestionTestId}.custom_status_emoji.${emojiName}`);
        const customStatusTextMatcher = by.id(`${customStatusSuggestionTestId}.custom_status_text`);
        const customStatusDurationMatcher = by.id(`${customStatusSuggestionTestId}.custom_status_duration.${duration}`);
        const customStatusClearButtonMatcher = by.id(`${customStatusSuggestionTestId}.clear.button`);

        return {
            customStatusSuggestion: element(customStatusSuggestionMatcher),
            customStatusSuggestionEmoji: element(customStatusEmojiMatcher),
            customStatusSuggestionText: element(customStatusTextMatcher),
            customStatusSuggestionDuration: element(customStatusDurationMatcher),
            customStatusClearButton: element(customStatusClearButtonMatcher),
        };
    };

    getRecentCustomStatus = (emojiName: string, text: string, duration: string) => {
        const recentsMatcher = by.id(this.testID.recents);
        return this.getCustomStatusSuggestion(recentsMatcher, emojiName, text, duration);
    };

    getSuggestedCustomStatus = (emojiName: string, text: string, duration: string) => {
        const suggestedMatcher = by.id(this.testID.suggestions);
        return this.getCustomStatusSuggestion(suggestedMatcher, emojiName, text, duration);
    };

    toBeVisible = async () => {
        await waitFor(this.customStatusScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // Wait for the modal's `Done` button to pass the visibility threshold
        // as a deterministic signal that the slide-up animation has landed and
        // the header is interactive. We deliberately do NOT anchor on
        // `suggestions` here: locally on iPhone 17 Pro / iOS 26 the
        // `custom_status.suggestions` wrapper View is fully drawn on screen
        // but still trips Detox's 75% visibility check (reproducible — even a
        // 10s wait on the same matcher returns the same error). That looks
        // like an iOS-26 Detox quirk on this specific wrapper, orthogonal to
        // the settle wait; MM-T4990_1's `expect(suggestions).toBeVisible()`
        // assertion needs a separate investigation. Anchoring on `suggestions`
        // would also make `toBeVisible()` time out whenever the user has used
        // every default status (the component returns null in that case).
        await waitFor(this.doneButton).toBeVisible().withTimeout(timeouts.FIVE_SEC);

        return this.customStatusScreen;
    };

    open = async () => {
        // # Open custom status screen
        await AccountScreen.setStatusOption.tap();

        return this.toBeVisible();
    };

    openEmojiPicker = async (emojiName: string, closeToolTip = false) => {
        await this.getCustomStatusEmoji(emojiName).tap();
        if (closeToolTip) {
            await wait(timeouts.TWO_SEC);
            try {
                await EmojiPickerScreen.toolTipCloseButton.tap();
            } catch (error) {
                // Tool tip not shown
            }
        }
        await EmojiPickerScreen.toBeVisible();
    };

    close = async () => {
        await this.doneButton.tap();
        await expect(this.customStatusScreen).not.toBeVisible();
    };
}

const customStatusScreen = new CustomStatusScreen();
export default customStatusScreen;
