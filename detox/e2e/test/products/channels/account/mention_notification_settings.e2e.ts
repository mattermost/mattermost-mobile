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
    HomeScreen,
    LoginScreen,
    MentionNotificationSettingsScreen,
    NotificationSettingsScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Account - Settings - Mention Notification Settings', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server, open account screen, open settings screen, open notification settings screen, and go to mention notification settings screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
        await SettingsScreen.open();
        await NotificationSettingsScreen.open();
        await MentionNotificationSettingsScreen.open();
    });

    beforeEach(async () => {
        // * Verify on mention notification settings screen
        await MentionNotificationSettingsScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await MentionNotificationSettingsScreen.back();
        await NotificationSettingsScreen.back();
        await SettingsScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5107_1 - should match elements on mention notification settings screen', async () => {
        // * Verify basic elements on mention notification settings screen
        await expect(MentionNotificationSettingsScreen.backButton).toBeVisible();
        await expect(MentionNotificationSettingsScreen.caseSensitiveFirstNameOptionToggledOff).toBeVisible();
        await expect(MentionNotificationSettingsScreen.nonCaseSensitiveUsernameOptionToggledOff).toBeVisible();
        await expect(MentionNotificationSettingsScreen.channelWideMentionsOptionToggledOn).toBeVisible();
        await expect(MentionNotificationSettingsScreen.keywordsInput).toBeVisible();
        await expect(MentionNotificationSettingsScreen.keywordsInputDescription).toHaveText('Keywords are not case-sensitive. Separate keywords with commas.');
    });

    it('MM-T5107_2 - should be able to change mention notification settings and save by tapping navigation back button', async () => {
        // # Switch toggles, type in keywords as camelcase with spaces, tap on back button, and go back to mention notifications screen
        const keywords = `Keywords ${getRandomId()}`;
        const commasSeparator = ',';
        await MentionNotificationSettingsScreen.toggleCaseSensitiveFirstNameOptionOn();
        await MentionNotificationSettingsScreen.toggleNonCaseSensitiveUsernameOptionOn();
        await MentionNotificationSettingsScreen.toggleChannelWideMentionsOptionOff();
        await MentionNotificationSettingsScreen.keywordsInput.typeText(keywords);
        await MentionNotificationSettingsScreen.keywordsInput.typeText(commasSeparator);
        await MentionNotificationSettingsScreen.back();
        await MentionNotificationSettingsScreen.open();

        // * Verify toggles are switched and keywords are saved as lowercase without spaces
        await expect(MentionNotificationSettingsScreen.caseSensitiveFirstNameOptionToggledOn).toBeVisible();
        await expect(MentionNotificationSettingsScreen.nonCaseSensitiveUsernameOptionToggledOn).toBeVisible();
        await expect(MentionNotificationSettingsScreen.channelWideMentionsOptionToggledOff).toBeVisible();
        if (isIos()) {
            const triggerMentionKeyword = await MentionNotificationSettingsScreen.getKeywordTriggerElement(keywords);
            await expect(triggerMentionKeyword).toHaveText(keywords.replace(/ /g, '').toLowerCase());
        } else {
            await waitFor(element(by.text(keywords.replace(/ /g, '').toLowerCase()))).toExist().withTimeout(timeouts.TWO_SEC);
        }

        // # Switch toggles back to original state, clear keywords, tap on back button, and go back to mention notifications screen
        await MentionNotificationSettingsScreen.toggleCaseSensitiveFirstNameOptionOff();
        await MentionNotificationSettingsScreen.toggleNonCaseSensitiveUsernameOptionOff();
        await MentionNotificationSettingsScreen.toggleChannelWideMentionsOptionOn();
        await MentionNotificationSettingsScreen.keywordsInput.clearText();
        await MentionNotificationSettingsScreen.back();
        await MentionNotificationSettingsScreen.open();

        // * Verify toggles are switched back to original state and keywords are cleared
        await expect(MentionNotificationSettingsScreen.caseSensitiveFirstNameOptionToggledOff).toBeVisible();
        await expect(MentionNotificationSettingsScreen.nonCaseSensitiveUsernameOptionToggledOff).toBeVisible();
        await expect(MentionNotificationSettingsScreen.channelWideMentionsOptionToggledOn).toBeVisible();
        await expect(MentionNotificationSettingsScreen.keywordsInput).not.toHaveValue(keywords.replace(/ /g, '').toLowerCase());
    });
});
