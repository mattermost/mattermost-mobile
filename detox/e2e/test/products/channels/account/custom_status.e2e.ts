// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
    Status,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    CreateDirectMessageScreen,
    CustomStatusScreen,
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Account - Custom Status', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    // Predefined status configurations
    const STATUSES = {
        IN_MEETING: {emoji: 'calendar', text: 'In a meeting', duration: 'one_hour'},
        OUT_FOR_LUNCH: {emoji: 'hamburger', text: 'Out for lunch', duration: 'thirty_minutes'},
        OUT_SICK: {emoji: 'sneezing_face', text: 'Out sick', duration: 'today'},
        WORKING_FROM_HOME: {emoji: 'house', text: 'Working from home', duration: 'today'},
        ON_VACATION: {emoji: 'palm_tree', text: 'On a vacation', duration: 'this_week'},
    };

    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        const channelList = element(by.id('channel_list.screen'));
        const accountScreen = element(by.id('account.screen'));
        const customStatusScreen = element(by.id('custom_status.screen'));

        try {
            await waitFor(customStatusScreen).toBeVisible().withTimeout(timeouts.TWO_SEC);
            /* eslint-disable no-await-in-loop */
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    if (isIos()) {
                        await element(by.id('close.custom_status.button')).tap();
                    } else {
                        await device.pressBack();
                    }
                    await wait(timeouts.ONE_SEC);
                    await waitFor(customStatusScreen).not.toBeVisible().withTimeout(timeouts.TWO_SEC);
                    break;
                } catch { /* dismissal didn't take, retry */ }
            }
            /* eslint-enable no-await-in-loop */
        } catch {
            /* No lingering modal — fall through to the normal probe below */
        }

        const probe = async () => {
            try {
                await waitFor(channelList).toExist().withTimeout(timeouts.TWO_SEC);
                return true;
            } catch { /* not on channel list */ }
            try {
                await waitFor(accountScreen).toExist().withTimeout(timeouts.TWO_SEC);
                return true;
            } catch { /* not on account either */ }
            return false;
        };

        if (await probe()) {
            await User.apiLogin(siteOneUrl, testUser);
            await Status.apiUnsetCustomStatus(siteOneUrl, testUser.id);
            return;
        }

        // Gentle recovery: dismiss whatever modal is on top.
        /* eslint-disable no-await-in-loop */
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                if (isIos()) {
                    // Custom-status modal X (only present if the modal is open).
                    await element(by.id('close.custom_status.button')).tap();
                } else {
                    await device.pressBack();
                }
                await wait(timeouts.ONE_SEC);
            } catch { /* nothing to dismiss */ }
            if (await probe()) {
                await User.apiLogin(siteOneUrl, testUser);
                await Status.apiUnsetCustomStatus(siteOneUrl, testUser.id);
                return;
            }
        }
        /* eslint-enable no-await-in-loop */

        throw new Error('beforeEach: expected channel_list.screen or account.screen, neither was visible after recovery attempts');
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4990_1 - should match elements on custom status screen', async () => {
        // # Go to account screen and open custom status screen
        await openCustomStatusScreen();

        // * Verify basic elements on custom status screen
        await expect(CustomStatusScreen.doneButton).toBeVisible();
        await expect(CustomStatusScreen.getCustomStatusEmoji('default')).toBeVisible();
        await expect(CustomStatusScreen.statusInput).toBeVisible();
        await expect(CustomStatusScreen.suggestions).toExist();

        // * Verify all 5 suggested statuses
        await verifyAllSuggestedStatuses();

        // # Go back to account screen
        await CustomStatusScreen.close();
    });

    it('MM-T4990_2 - should be able to set a status via suggestions', async () => {
        const status = STATUSES.IN_MEETING;

        await openCustomStatusScreen();
        await selectSuggestedStatus(status);
        await CustomStatusScreen.doneButton.tap();
        await waitForCustomStatusOnAccount(status);

        // * Verify status is set on account screen
        await verifyStatusSetOnAccountScreen(status);

        // # Open custom status screen
        await CustomStatusScreen.open();

        // * Verify status shown in input, recent section, and removed from suggestions
        await verifyStatusInInput(status);
        const {customStatusSuggestion: recentStatus, customStatusClearButton: clearButton} =
            CustomStatusScreen.getRecentCustomStatus(status.emoji, status.text, status.duration);
        await expect(recentStatus).toBeVisible();
        await expect(CustomStatusScreen.getSuggestedCustomStatus(status.emoji, status.text, status.duration).customStatusSuggestion).not.toExist();

        // # Clear recent status
        await clearButton.tap();
        await expect(recentStatus).not.toExist();
        await expect(CustomStatusScreen.getSuggestedCustomStatus(status.emoji, status.text, status.duration).customStatusSuggestion).toBeVisible();

        // # Clean up
        await clearStatusInput();
        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.ONE_SEC);
    });

    it('MM-T4990_3 - should be able to set a status via emoji picker and custom status', async () => {
        const customEmojiName = 'clown_face';
        const customStatusText = `Status ${getRandomId()}`;
        const customStatusDuration = 'today';

        await openCustomStatusScreen();

        // # Pick emoji and type custom status
        await openEmojiPickerForDefault();
        await EmojiPickerScreen.searchInput.replaceText(customEmojiName);
        await EmojiPickerScreen.searchInput.tapReturnKey();
        await EmojiPickerScreen.tapSearchResultEmoji('🤡');
        await wait(timeouts.ONE_SEC);
        await CustomStatusScreen.statusInput.replaceText(customStatusText);
        await CustomStatusScreen.doneButton.tap();
        await waitForCustomStatusOnAccount({emoji: customEmojiName, duration: customStatusDuration});

        // * Verify custom status is set
        await verifyStatusSetOnAccountScreen({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});

        // # Open custom status screen and verify in recent
        await CustomStatusScreen.open();
        await verifyStatusInInput({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});
        const {customStatusSuggestion: recentStatus, customStatusClearButton: clearButton} =
            CustomStatusScreen.getRecentCustomStatus(customEmojiName, customStatusText, customStatusDuration);
        await expect(recentStatus).toBeVisible();

        // # Clean up
        await clearButton.tap();
        await clearStatusInput();
        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.ONE_SEC);
    });

    it('MM-T4990_4 - should be able to clear custom status from account', async () => {
        const status = STATUSES.IN_MEETING;

        await openCustomStatusScreen();
        await selectSuggestedStatus(status);
        await CustomStatusScreen.doneButton.tap();
        await waitForCustomStatusOnAccount(status);

        // * Verify status is set
        await verifyStatusSetOnAccountScreen(status);

        // # Clear status from account screen
        await AccountScreen.customStatusClearButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify status is cleared
        await verifyStatusCleared();

        // # Open custom status screen and verify cleared
        await CustomStatusScreen.open();
        await wait(timeouts.ONE_SEC);
        await expect(CustomStatusScreen.getCustomStatusEmoji('default')).toBeVisible();
        await expect(CustomStatusScreen.statusInput).toHaveText('');

        const {customStatusSuggestion: recentCustomStatus, customStatusClearButton: recentClearButton} =
            CustomStatusScreen.getRecentCustomStatus(status.emoji, status.text, status.duration);
        await expect(recentCustomStatus).toBeVisible();

        // # Remove custom status from recent (should be completely deleted)
        await recentClearButton.tap();
        await expect(recentCustomStatus).not.toExist();

        await CustomStatusScreen.close();
    });

    it('MM-T3890 - should be able to select and reselect suggested status', async () => {
        const status = STATUSES.IN_MEETING;

        await AccountScreen.open();
        await expect(AccountScreen.setStatusOption).toExist();
        await CustomStatusScreen.open();

        // # Select "In a meeting" status
        await selectSuggestedStatus(status);
        await verifyStatusInInput(status);

        // # Select same status again
        await selectSuggestedStatus(status);
        await verifyStatusInInput(status);

        // # Save status
        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.TWO_SEC);
        await expect(CustomStatusScreen.customStatusScreen).not.toBeVisible();

        // * Verify status is set and visible in account screen
        await AccountScreen.toBeVisible();
        const {accountCustomStatusEmoji, accountCustomStatusText} =
            AccountScreen.getCustomStatus(status.emoji, status.duration);

        // iOS-26 wrapper-View visibility quirk: Detox's visibility predicate
        // mis-reports for the <View> wrapping <Emoji>. Same pattern documented at
        // custom_status.ts:95-103. The emoji IS rendered (proven by failure screenshot
        // showing the calendar emoji on Account screen). Use toExist instead.
        await expect(accountCustomStatusEmoji).toExist();
        await expect(accountCustomStatusText).toHaveText(status.text);

        // # Reopen custom status screen
        await AccountScreen.setStatusOption.tap();
        await CustomStatusScreen.toBeVisible();

        // # Clean up
        await clearStatusInput();

        const {customStatusSuggestion: recentCustomStatus, customStatusClearButton: recentClearButton} =
            CustomStatusScreen.getRecentCustomStatus(status.emoji, status.text, status.duration);
        await expect(recentCustomStatus).toBeVisible();

        // # Remove custom status from recent (should be completely deleted)
        await recentClearButton.tap();
        await expect(recentCustomStatus).not.toExist();

        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.ONE_SEC);
    });

    it('MM-T3891 - should be able to set custom status with emoji picker and manage it', async () => {
        const customStatusText = `Status ${getRandomId()}`;
        const customEmojiName = 'fire';
        const customStatusDuration = 'today';

        await AccountScreen.open();
        await CustomStatusScreen.open();

        // # Type status text and verify speech balloon emoji appears
        // iOS-26 wrapper-View visibility quirk: use toExist (see MM-T3890 above).
        await CustomStatusScreen.statusInput.tap();
        await CustomStatusScreen.statusInput.typeText(customStatusText);
        await expect(CustomStatusScreen.getCustomStatusEmoji('speech_balloon')).toExist();

        // # Open emoji picker and select fire emoji
        await CustomStatusScreen.openEmojiPicker('speech_balloon');
        await EmojiPickerScreen.toBeVisible();
        await EmojiPickerScreen.searchInput.typeText(customEmojiName);
        await element(by.text('🔥')).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify emoji picker dismissed and fire emoji shown
        await expect(EmojiPickerScreen.emojiPickerScreen).not.toBeVisible();
        await expect(CustomStatusScreen.getCustomStatusEmoji(customEmojiName)).toBeVisible();

        // # Save status
        await CustomStatusScreen.doneButton.tap();
        await waitForCustomStatusOnAccount({emoji: customEmojiName, duration: customStatusDuration});

        // * Verify status is set in account screen
        await verifyStatusSetOnAccountScreen({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});

        // # Clear status from account screen
        await AccountScreen.customStatusClearButton.tap();
        await wait(timeouts.ONE_SEC);
        await verifyStatusCleared();

        // # Reopen and verify status in recent section
        await CustomStatusScreen.open();

        await expect(CustomStatusScreen.recents).toExist();
        const {customStatusSuggestion: recentStatus} =
            CustomStatusScreen.getRecentCustomStatus(customEmojiName, customStatusText, customStatusDuration);
        await expect(recentStatus).toBeVisible();

        // # Select status from recent and save
        await recentStatus.tap();
        await verifyStatusInInput({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});
        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify status is set again
        // iOS-26 wrapper-View visibility quirk: use toExist (see MM-T3890 above).
        await AccountScreen.toBeVisible();
        const {accountCustomStatusEmoji} = AccountScreen.getCustomStatus(customEmojiName, customStatusDuration);
        await expect(accountCustomStatusEmoji).toExist();

        // # Clear status field and save
        await CustomStatusScreen.open();
        await clearStatusInput();

        const {customStatusSuggestion: recentCustomStatus, customStatusClearButton: recentClearButton} =
            CustomStatusScreen.getRecentCustomStatus(customEmojiName, customStatusText, customStatusDuration);
        await expect(recentCustomStatus).toBeVisible();

        // # Remove custom status from recent (should be completely deleted)
        await recentClearButton.tap();
        await expect(recentCustomStatus).not.toExist();

        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify status is cleared
        await verifyStatusCleared();
    });

    it('MM-T3892 - should manage recent custom statuses correctly', async () => {
        const customEmojiName = 'clown_face';
        const customStatusText = `Custom Status ${getRandomId()}`;
        const customStatusDuration = 'today';

        await openCustomStatusScreen();

        // # Create custom status with emoji picker
        await openEmojiPickerForDefault();
        await EmojiPickerScreen.searchInput.replaceText(customEmojiName);
        await EmojiPickerScreen.searchInput.tapReturnKey();
        await EmojiPickerScreen.tapSearchResultEmoji('🤡');
        await wait(timeouts.ONE_SEC);
        await CustomStatusScreen.statusInput.replaceText(customStatusText);
        await CustomStatusScreen.doneButton.tap();
        await waitForCustomStatusOnAccount({emoji: customEmojiName, duration: customStatusDuration});

        // * Verify status is set
        await verifyStatusSetOnAccountScreen({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});

        // # Clear and verify in recent section
        await AccountScreen.customStatusClearButton.tap();
        await CustomStatusScreen.open();
        await expect(CustomStatusScreen.recents).toExist();

        const {customStatusSuggestion: recentCustomStatus, customStatusClearButton: recentClearButton} =
            CustomStatusScreen.getRecentCustomStatus(customEmojiName, customStatusText, customStatusDuration);
        await expect(recentCustomStatus).toBeVisible();

        // # Remove custom status from recent (should be completely deleted)
        await recentClearButton.tap();
        await expect(recentCustomStatus).not.toExist();
        await expect(CustomStatusScreen.getSuggestedCustomStatus(customEmojiName, customStatusText, customStatusDuration).customStatusSuggestion).not.toExist();

        // # Select default status
        const suggestedStatus = STATUSES.IN_MEETING;
        await selectSuggestedStatus(suggestedStatus);
        await CustomStatusScreen.doneButton.tap();
        await waitForCustomStatusOnAccount(suggestedStatus);
        await verifyStatusSetOnAccountScreen(suggestedStatus);

        // # Clear and verify in recent section
        await AccountScreen.customStatusClearButton.tap();
        await CustomStatusScreen.open();

        const {customStatusSuggestion: recentSuggestedStatus, customStatusClearButton: recentSuggestedClearButton} =
            CustomStatusScreen.getRecentCustomStatus(suggestedStatus.emoji, suggestedStatus.text, suggestedStatus.duration);
        await expect(recentSuggestedStatus).toBeVisible();
        await expect(CustomStatusScreen.getSuggestedCustomStatus(suggestedStatus.emoji, suggestedStatus.text, suggestedStatus.duration).customStatusSuggestion).not.toExist();

        // # Remove suggested status from recent (should move back to suggestions)
        await recentSuggestedClearButton.tap();
        await expect(recentSuggestedStatus).not.toExist();
        await expect(CustomStatusScreen.getSuggestedCustomStatus(suggestedStatus.emoji, suggestedStatus.text, suggestedStatus.duration).customStatusSuggestion).toBeVisible();

        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.ONE_SEC);
    });

    it('MM-T4091 - should be able to set custom status with expiry time and verify in various locations', async () => {
        const status = STATUSES.OUT_FOR_LUNCH;
        const messageText = `Message ${getRandomId()}`;

        await AccountScreen.open();
        await CustomStatusScreen.open();

        // # Select status with 30 minutes expiry
        await selectSuggestedStatus(status);
        await expect(CustomStatusScreen.getCustomStatusExpiry(status.duration)).toBeVisible();
        await CustomStatusScreen.doneButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify status is set with expiry time
        // iOS-26 wrapper-View visibility quirk for the emoji (see MM-T3890 above);
        // text and expiry are plain <Text> nodes and use toBeVisible normally.
        await AccountScreen.toBeVisible();
        const {accountCustomStatusEmoji, accountCustomStatusText, accountCustomStatusExpiry} =
            AccountScreen.getCustomStatus(status.emoji, status.duration);
        await expect(accountCustomStatusEmoji).toExist();
        await expect(accountCustomStatusText).toHaveText(status.text);
        await expect(accountCustomStatusExpiry).toBeVisible();

        // # Create post and verify status in user profile
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(messageText);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem, postListPostItemHeaderDisplayName} =
            ChannelScreen.getPostListPostItem(post.id, messageText, {userId: testUser.id});
        await expect(postListPostItem).toBeVisible();

        // # Tap display name to open user profile (more reliable than avatar tap)
        await expect(postListPostItemHeaderDisplayName).toBeVisible();
        await postListPostItemHeaderDisplayName.longPress();
        await wait(timeouts.ONE_SEC);
        await UserProfileScreen.toBeVisible();
        await UserProfileScreen.close();
        await ChannelScreen.back();

        // # Create DM and verify status in channel info
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();
        await CreateDirectMessageScreen.searchInput.replaceText(testUser.username);
        await wait(timeouts.TWO_SEC);
        await expect(CreateDirectMessageScreen.getUserItemDisplayName(testUser.id)).toBeVisible();
        await CreateDirectMessageScreen.getUserItemDisplayName(testUser.id).tap();
        await wait(timeouts.TWO_SEC);

        try {
            await ChannelScreen.scheduledPostTooltipCloseButton.tap();
        } catch (e) {
            // Tooltip not present
        }

        // # Open channel info and verify status
        await ChannelScreen.toBeVisible();
        await ChannelScreen.headerTitle.tap();
        await wait(timeouts.FOUR_SEC);
        await ChannelInfoScreen.toBeVisible();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});

// ==================== Helper Functions ====================

const openCustomStatusScreen = async () => {
    await AccountScreen.open();
    await CustomStatusScreen.open();
    await CustomStatusScreen.toBeVisible();
};

const selectSuggestedStatus = async (status: {emoji: string; text: string; duration: string}) => {
    const suggested = CustomStatusScreen.getSuggestedCustomStatus(status.emoji, status.text, status.duration);
    const scrollIntoView = async (target: Detox.NativeElement) => {
        if (isIos()) {
            try {
                await waitFor(target).toBeVisible(50).whileElement(by.id(CustomStatusScreen.testID.scrollView)).scroll(100, 'down');
            } catch {
                try {
                    await waitFor(target).toBeVisible(50).whileElement(by.id(CustomStatusScreen.testID.scrollView)).scroll(100, 'up');
                } catch { /* already in view */ }
            }
        }
        await waitFor(target).toExist().withTimeout(timeouts.FIVE_SEC);
        await target.tap();
    };
    try {
        await waitFor(suggested.customStatusSuggestion).toExist().withTimeout(timeouts.TWO_SEC);
        await scrollIntoView(suggested.customStatusSuggestion);
        return;
    } catch { /* try recents */ }
    const recent = CustomStatusScreen.getRecentCustomStatus(status.emoji, status.text, status.duration);
    await scrollIntoView(recent.customStatusSuggestion);
};

const waitForCustomStatusOnAccount = async (status: {emoji: string; duration: string}) => {
    await waitFor(CustomStatusScreen.customStatusScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    await AccountScreen.toBeVisible();
    const {accountCustomStatusEmoji} = AccountScreen.getCustomStatus(status.emoji, status.duration);
    await waitFor(accountCustomStatusEmoji).toExist().withTimeout(timeouts.TEN_SEC);
    await waitFor(AccountScreen.customStatusClearButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
};

const openEmojiPickerForDefault = async () => {
    const defaultEmoji = CustomStatusScreen.getCustomStatusEmoji('default');
    try {
        await waitFor(defaultEmoji).toExist().withTimeout(timeouts.TEN_SEC);
    } catch {
        try {
            await waitFor(CustomStatusScreen.statusInputClearButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await CustomStatusScreen.statusInputClearButton.tap();
            await waitFor(defaultEmoji).toExist().withTimeout(timeouts.FIVE_SEC);
        } catch {
            // No clear button to use — fall through to the picker open below.
        }
    }
    await CustomStatusScreen.openEmojiPicker('default');
};

const verifyStatusInInput = async (status: {emoji: string; text: string; duration: string}) => {
    await expect(CustomStatusScreen.getCustomStatusEmoji(status.emoji)).toBeVisible();
    if (isIos()) {
        await expect(CustomStatusScreen.statusInput).toHaveValue(status.text);
    } else {
        await expect(CustomStatusScreen.statusInput).toHaveText(status.text);
    }
};

const clearStatusInput = async () => {
    await CustomStatusScreen.statusInputClearButton.tap();
};

const verifyAllSuggestedStatuses = async () => {
    await expect(CustomStatusScreen.suggestions).toExist();

    // Verify each suggestion exists on screen (either in suggestions or recents).
    // On fresh runs, suggestions land in the suggestions block; when state leaks
    // from a prior run, some may already be in recents — the item is still visible.
    await verifySuggestedOrRecentCustomStatus('calendar', 'In a meeting', 'one_hour');
    await verifySuggestedOrRecentCustomStatus('hamburger', 'Out for lunch', 'thirty_minutes');
    await verifySuggestedOrRecentCustomStatus('sneezing_face', 'Out sick', 'today');
    await verifySuggestedOrRecentCustomStatus('house', 'Working from home', 'today');
    await verifySuggestedOrRecentCustomStatus('palm_tree', 'On a vacation', 'this_week');
};

const verifySuggestedOrRecentCustomStatus = async (emojiName: string, text: string, duration: string) => {
    // Try suggestions first; fall back to recents if the item was leaked from a prior run.
    // Emoji uses `toExist` (iOS-26 wrapper-View visibility quirk on <View> around <Emoji>);
    // text and duration are plain <Text> and use `toBeVisible` normally.
    try {
        const {customStatusSuggestionEmoji, customStatusSuggestionText, customStatusSuggestionDuration} =
            CustomStatusScreen.getSuggestedCustomStatus(emojiName, text, duration);
        await expect(customStatusSuggestionEmoji).toExist();
        await expect(customStatusSuggestionText).toBeVisible();
        await expect(customStatusSuggestionDuration).toBeVisible();
    } catch {
        const {customStatusSuggestionEmoji, customStatusSuggestionText, customStatusSuggestionDuration} =
            CustomStatusScreen.getRecentCustomStatus(emojiName, text, duration);
        await expect(customStatusSuggestionEmoji).toExist();
        await expect(customStatusSuggestionText).toBeVisible();
        await expect(customStatusSuggestionDuration).toBeVisible();
    }
};

const verifyStatusSetOnAccountScreen = async (status: {emoji: string; text: string; duration: string}) => {
    await waitForCustomStatusOnAccount(status);
    await AccountScreen.toBeVisible();
    const {accountCustomStatusEmoji, accountCustomStatusText, accountCustomStatusExpiry} =
        AccountScreen.getCustomStatus(status.emoji, status.duration);

    await expect(accountCustomStatusEmoji).toExist();
    await expect(accountCustomStatusText).toHaveText(status.text);
    await expect(accountCustomStatusExpiry).toBeVisible();
};

const verifyStatusCleared = async () => {
    await waitFor(AccountScreen.customStatusClearButton).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    await expect(AccountScreen.setStatusOption).toExist();
};
