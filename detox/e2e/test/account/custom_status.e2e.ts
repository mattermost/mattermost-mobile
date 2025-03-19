// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    CustomStatusScreen,
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Account - Custom Status', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server and go to account screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
    });

    beforeEach(async () => {
        // * Verify on account screen
        await AccountScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4990_1 - should match elements on custom status screen', async () => {
        // # Open custom status screen
        await CustomStatusScreen.open();

        // * Verify basic elements on custom status screen
        await expect(CustomStatusScreen.doneButton).toBeVisible();
        await expect(CustomStatusScreen.getCustomStatusEmoji('default')).toBeVisible();
        await expect(CustomStatusScreen.statusInput).toBeVisible();
        await expect(CustomStatusScreen.suggestions).toBeVisible();
        await verifySuggestedCustomStatus('calendar', 'In a meeting', 'one_hour');
        await verifySuggestedCustomStatus('hamburger', 'Out for lunch', 'thirty_minutes');
        await verifySuggestedCustomStatus('sneezing_face', 'Out sick', 'today');
        await verifySuggestedCustomStatus('house', 'Working from home', 'today');
        await verifySuggestedCustomStatus('palm_tree', 'On a vacation', 'this_week');

        // # Go back to account screen
        await CustomStatusScreen.close();
    });

    it('MM-T4990_2 - should be able to set a status via suggestions', async () => {
        // # Open custom status screen, tap on a suggested custom status, and tap on done button
        const customStatusEmojiName = 'calendar';
        const customStatusText = 'In a meeting';
        const customStatusDuration = 'one_hour';
        await CustomStatusScreen.open();
        const {customStatusSuggestion} = CustomStatusScreen.getSuggestedCustomStatus(customStatusEmojiName, customStatusText, customStatusDuration);
        await customStatusSuggestion.tap();
        await CustomStatusScreen.doneButton.tap();

        // * Verify on account screen and suggested custom status is set
        await verifyOnAccountScreenAndCustomStatusIsSet(customStatusEmojiName, customStatusText, customStatusDuration);

        // # Open custom status screen
        await CustomStatusScreen.open();

        // * Verify custom status is set on the field, shown under recent, and removed from suggestions
        await expect(CustomStatusScreen.getCustomStatusEmoji(customStatusEmojiName)).toBeVisible();
        if (isIos()) {
            await expect(CustomStatusScreen.statusInput).toHaveValue(customStatusText);
        } else {
            await expect(CustomStatusScreen.statusInput).toHaveText(customStatusText);
        }
        const {customStatusSuggestion: recentCustomStatus, customStatusClearButton: recentCustomStatusClearButton} = CustomStatusScreen.getRecentCustomStatus(customStatusEmojiName, customStatusText, customStatusDuration);
        await expect(recentCustomStatus).toBeVisible();
        const {customStatusSuggestion: suggestedCustomStatus} = CustomStatusScreen.getSuggestedCustomStatus(customStatusEmojiName, customStatusText, customStatusDuration);
        await expect(suggestedCustomStatus).not.toExist();

        // # Tap on clear button for custom status from recent
        await recentCustomStatusClearButton.tap();

        // * Verify custom status is removed from recent and shown back under suggestions
        await expect(recentCustomStatus).not.toExist();
        await expect(suggestedCustomStatus).toBeVisible();

        // # Tap on status input clear button and tap on done button
        await CustomStatusScreen.statusInputClearButton.tap();
        await CustomStatusScreen.doneButton.tap();
    });

    it('MM-T4990_3 - should be able to set a status via emoji picker and custom status', async () => {
        // # Open custom status screen, pick an emoji and type in custom status, and tap on done button
        const customStatusEmojiName = 'clown_face';
        const customStatusText = `Status ${getRandomId()}`;
        const customStatusDuration = 'today';
        await CustomStatusScreen.open();
        await CustomStatusScreen.openEmojiPicker('default', true);
        await EmojiPickerScreen.searchInput.replaceText(customStatusEmojiName);
        await element(by.text('🤡')).tap();
        await wait(timeouts.ONE_SEC);
        await CustomStatusScreen.statusInput.replaceText(customStatusText);
        await CustomStatusScreen.doneButton.tap();

        // * Verify on account screen and custom status is set
        await verifyOnAccountScreenAndCustomStatusIsSet(customStatusEmojiName, customStatusText, customStatusDuration);

        // # Open custom status screen
        await CustomStatusScreen.open();

        // * Verify custom status is set on the field and shown under recent
        await expect(CustomStatusScreen.getCustomStatusEmoji(customStatusEmojiName)).toBeVisible();
        if (isIos()) {
            await expect(CustomStatusScreen.statusInput).toHaveValue(customStatusText);
        } else {
            await expect(CustomStatusScreen.statusInput).toHaveText(customStatusText);
        }
        const {customStatusSuggestion: recentCustomStatus, customStatusClearButton: recentCustomStatusClearButton} = CustomStatusScreen.getRecentCustomStatus(customStatusEmojiName, customStatusText, customStatusDuration);
        await expect(recentCustomStatus).toBeVisible();

        // # Tap on clear button for custom status from recent
        await recentCustomStatusClearButton.tap();

        // * Verify custom status is removed from recent
        await expect(recentCustomStatus).not.toExist();

        // # Tap on status input clear button and tap on done button
        await CustomStatusScreen.statusInputClearButton.tap();
        await CustomStatusScreen.doneButton.tap();
    });

    it('MM-T4990_4 - should be able to clear custom status from account', async () => {
        // # Open custom status screen, tap on a suggested custom status, and tap on done button
        const customStatusEmojiName = 'calendar';
        const customStatusText = 'In a meeting';
        const customStatusDuration = 'one_hour';
        await CustomStatusScreen.open();
        const {customStatusSuggestion} = CustomStatusScreen.getSuggestedCustomStatus(customStatusEmojiName, customStatusText, customStatusDuration);
        await customStatusSuggestion.tap();
        await CustomStatusScreen.doneButton.tap();

        // * Verify on account screen and suggested custom status is set
        await verifyOnAccountScreenAndCustomStatusIsSet(customStatusEmojiName, customStatusText, customStatusDuration);

        // # Tap on clear button for custom status from display field
        await AccountScreen.customStatusClearButton.tap();

        // * Verify custom status is cleared from account screen
        const defaultStatusText = 'Set a custom status';
        const {accountCustomStatusEmoji, accountCustomStatusText, accountCustomStatusExpiry} = AccountScreen.getCustomStatus(customStatusEmojiName, customStatusDuration);
        await expect(accountCustomStatusEmoji).not.toExist();
        await expect(accountCustomStatusText).toHaveText(defaultStatusText);
        await expect(accountCustomStatusExpiry).not.toExist();

        // # Open custom status screen
        await CustomStatusScreen.open();

        await wait(timeouts.ONE_SEC);

        // * Verify custom status is cleared from input field
        await expect(CustomStatusScreen.getCustomStatusEmoji('default')).toBeVisible();
        await expect(CustomStatusScreen.statusInput).toHaveText('');

        // # Go back to account screen
        await CustomStatusScreen.close();
    });
});

const verifySuggestedCustomStatus = async (emojiName: string, text: string, duration: string) => {
    const {customStatusSuggestionEmoji, customStatusSuggestionText, customStatusSuggestionDuration} = CustomStatusScreen.getSuggestedCustomStatus(emojiName, text, duration);
    await expect(customStatusSuggestionEmoji).toBeVisible();
    await expect(customStatusSuggestionText).toBeVisible();
    await expect(customStatusSuggestionDuration).toBeVisible();
};

const verifyOnAccountScreenAndCustomStatusIsSet = async (emojiName: string, text: string, duration: string) => {
    await AccountScreen.toBeVisible();
    const {accountCustomStatusEmoji, accountCustomStatusText, accountCustomStatusExpiry} = AccountScreen.getCustomStatus(emojiName, duration);
    await expect(accountCustomStatusEmoji).toBeVisible();
    await expect(accountCustomStatusText).toHaveText(text);
    await expect(accountCustomStatusExpiry).toBeVisible();
};
