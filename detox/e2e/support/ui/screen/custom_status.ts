// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    AccountScreen,
    EmojiPickerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class CustomStatusScreen {
    testID = {
        customStatusEmojiPrefix: 'custom_status.custom_status_emoji.',
        customStatusDurationPrefix: 'custom_status.clear_after.custom_status_duration.',
        customStatusSuggestionPrefix: 'custom_status.custom_status_suggestion.',
        recentCustomStatusSuggestionPrefix: 'custom_status.recent_custom_status_suggestion.',
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

    getCustomStatusSuggestion = (_blockMatcher: Detox.NativeMatcher, prefix: string, emojiName: string, text: string, duration: string) => {
        // `prefix` disambiguates suggestions vs recents (they share the same
        // component but render with distinct testIdPrefix values — see
        // `app/screens/custom_status/components/custom_status_suggestion/custom_status_suggestion.tsx`).
        // This removes the need for `.withAncestor(blockMatcher)` which is
        // broken on iOS 26 where Detox cannot traverse to non-touchable
        // ancestor Views.
        const customStatusSuggestionTestId = `${prefix}${text}`;
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
        return this.getCustomStatusSuggestion(
            by.id(this.testID.recents),
            this.testID.recentCustomStatusSuggestionPrefix,
            emojiName,
            text,
            duration,
        );
    };

    getSuggestedCustomStatus = (emojiName: string, text: string, duration: string) => {
        return this.getCustomStatusSuggestion(
            by.id(this.testID.suggestions),
            this.testID.customStatusSuggestionPrefix,
            emojiName,
            text,
            duration,
        );
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
        // The account drawer rows may be partially clipped by the iOS 26
        // dynamic-island area. Use whileElement to scroll the drawer's
        // ScrollView until the setStatusOption is fully visible, then tap.
        // This handles both fresh drawer state (top of ScrollView) and
        // scrolled state from prior tests (MM-T3892).
        if (isAndroid()) {
            try {
                await waitFor(AccountScreen.setStatusOption).toExist().whileElement(by.id('account.scroll_view')).scroll(150, 'down');
            } catch {
                // Row may already be in view without scrolling.
            }
            await waitForElementToExist(AccountScreen.setStatusOption, timeouts.TEN_SEC);
        } else {
            // iOS: the account drawer is a partial-height bottom sheet whose
            // ScrollView is routinely <100% visible (clipped by the sheet's
            // top edge / bottom safe area), so Detox's `whileElement().scroll()`
            // refuses with "View is not scrollable at the given start point" —
            // it picks a start point off-screen. This hard-crashes 5 tests in
            // ios-junit 28392181656 (MM-T3890/3891/3892/4990_4/4091) at this
            // exact call. The "Set a custom status" row is also frequently
            // above the fold because a prior test left the drawer scrolled.
            // Probe visibility first; on failure, scroll with an explicit
            // start at the visible centre (always hittable — same convention
            // as `support/utils/index.ts` longPressWithScrollRetry), then
            // re-check. Tolerate a scroll refusal: 'down' is the right
            // direction for both top-clipped and scrolled-past-below cases.
            try {
                await waitFor(AccountScreen.setStatusOption).toBeVisible().withTimeout(timeouts.TWO_SEC);
            } catch {
                const scrollView = element(by.id('account.scroll_view'));
                let found = false;
                /* eslint-disable no-await-in-loop */
                for (let i = 0; i < 5 && !found; i++) {
                    for (const direction of ['down', 'up'] as const) {
                        try {
                            await scrollView.scroll(150, direction, 0.5, 0.5);
                        } catch { /* scroll refusal */ }
                        try {
                            await waitFor(AccountScreen.setStatusOption).toBeVisible().withTimeout(timeouts.TWO_SEC);
                            found = true;
                            break;
                        } catch { /* try opposite direction */ }
                    }
                }
                /* eslint-enable no-await-in-loop */
                if (!found) {
                    await waitFor(AccountScreen.setStatusOption).toBeVisible().withTimeout(timeouts.FIVE_SEC);
                }
            }
        }
        await AccountScreen.setStatusOption.tap();

        return this.toBeVisible();
    };

    openEmojiPicker = async (emojiName: string) => {
        await this.getCustomStatusEmoji(emojiName).tap();
        await EmojiPickerScreen.toBeVisible();
    };

    close = async () => {
        await this.doneButton.tap();
        await expect(this.customStatusScreen).not.toBeVisible();
    };
}

const customStatusScreen = new CustomStatusScreen();
export default customStatusScreen;
