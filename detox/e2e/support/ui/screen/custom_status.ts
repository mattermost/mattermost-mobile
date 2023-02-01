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
            await wait(timeouts.ONE_SEC);
            await EmojiPickerScreen.toolTipCloseButton.tap();
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
