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

    getCustomStatusSuggestion = (blockMatcher: Detox.NativeMatcher, emojiName: string, text: string, duration: string) => {
        const customStatusSuggestionTestId = `${this.testID.customStatusSuggestionPrefix}${text}`;
        const customStatusSuggestionMatcher = by.id(customStatusSuggestionTestId).withAncestor(blockMatcher);
        const customStatusEmojiMatcher = by.id(`${customStatusSuggestionTestId}.custom_status_emoji.${emojiName}`).withAncestor(blockMatcher);
        const customStatusTextMatcher = by.id(`${customStatusSuggestionTestId}.custom_status_text`).withAncestor(blockMatcher);
        const customStatusDurationMatcher = by.id(`${customStatusSuggestionTestId}.custom_status_duration.${duration}`).withAncestor(blockMatcher);
        const customStatusClearButtonMatcher = by.id(`${customStatusSuggestionTestId}.clear.button`).withAncestor(blockMatcher);

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
