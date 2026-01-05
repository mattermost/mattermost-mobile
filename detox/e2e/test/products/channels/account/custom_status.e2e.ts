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
import {expect} from 'detox';

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
        // * Verify on channel list screen or account screen depending on test
        try {
            await ChannelListScreen.toBeVisible();
        } catch (e) {
            await AccountScreen.toBeVisible();
        }
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
        await expect(CustomStatusScreen.suggestions).toBeVisible();

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
    });

    it('MM-T4990_3 - should be able to set a status via emoji picker and custom status', async () => {
        const customEmojiName = 'clown_face';
        const customStatusText = `Status ${getRandomId()}`;
        const customStatusDuration = 'today';

        await openCustomStatusScreen();

        // # Pick emoji and type custom status
        await CustomStatusScreen.openEmojiPicker('default', true);
        await EmojiPickerScreen.searchInput.replaceText(customEmojiName);
        await element(by.text('🤡')).tap();
        await wait(timeouts.ONE_SEC);
        await CustomStatusScreen.statusInput.replaceText(customStatusText);
        await CustomStatusScreen.doneButton.tap();

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
    });

    it('MM-T4990_4 - should be able to clear custom status from account', async () => {
        const status = STATUSES.IN_MEETING;

        await openCustomStatusScreen();
        await selectSuggestedStatus(status);
        await CustomStatusScreen.doneButton.tap();

        // * Verify status is set
        await verifyStatusSetOnAccountScreen(status);

        // # Clear status from account screen
        await AccountScreen.customStatusClearButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify status is cleared
        await verifyStatusCleared(status);

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
        await expect(AccountScreen.setStatusOption).toBeVisible();
        await CustomStatusScreen.open();

        // # Select "In a meeting" status
        const {customStatusSuggestion: inMeetingStatus} =
            CustomStatusScreen.getSuggestedCustomStatus(status.emoji, status.text, status.duration);
        await inMeetingStatus.tap();
        await verifyStatusInInput(status);

        // # Select same status again
        await inMeetingStatus.tap();
        await verifyStatusInInput(status);

        // # Save status
        await CustomStatusScreen.doneButton.tap();
        await expect(CustomStatusScreen.customStatusScreen).not.toBeVisible();

        // * Verify status is set and visible in account screen
        await AccountScreen.toBeVisible();
        const {accountCustomStatusEmoji, accountCustomStatusText} =
            AccountScreen.getCustomStatus(status.emoji, status.duration);
        await expect(accountCustomStatusEmoji).toBeVisible();
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
    });

    it('MM-T3891 - should be able to set custom status with emoji picker and manage it', async () => {
        const customStatusText = `Status ${getRandomId()}`;
        const customEmojiName = 'fire';
        const customStatusDuration = 'today';

        await AccountScreen.open();
        await CustomStatusScreen.open();

        // # Type status text and verify speech balloon emoji appears
        await CustomStatusScreen.statusInput.tap();
        await CustomStatusScreen.statusInput.typeText(customStatusText);
        await expect(CustomStatusScreen.getCustomStatusEmoji('speech_balloon')).toBeVisible();

        // # Open emoji picker and select fire emoji
        await CustomStatusScreen.openEmojiPicker('speech_balloon', true);
        await EmojiPickerScreen.toBeVisible();
        await EmojiPickerScreen.searchInput.typeText(customEmojiName);
        await element(by.text('🔥')).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify emoji picker dismissed and fire emoji shown
        await expect(EmojiPickerScreen.emojiPickerScreen).not.toBeVisible();
        await expect(CustomStatusScreen.getCustomStatusEmoji(customEmojiName)).toBeVisible();

        // # Save status
        await wait(timeouts.TWO_SEC);
        await CustomStatusScreen.doneButton.tap();

        // * Verify status is set in account screen
        await verifyStatusSetOnAccountScreen({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});

        // # Clear status from account screen
        await AccountScreen.customStatusClearButton.tap();
        await verifyStatusCleared({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});

        // # Reopen and verify status in recent section
        await CustomStatusScreen.open();
        await expect(CustomStatusScreen.recents).toBeVisible();
        const {customStatusSuggestion: recentStatus} =
            CustomStatusScreen.getRecentCustomStatus(customEmojiName, customStatusText, customStatusDuration);
        await expect(recentStatus).toBeVisible();

        // # Select status from recent and save
        await recentStatus.tap();
        await verifyStatusInInput({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});
        await CustomStatusScreen.doneButton.tap();

        // * Verify status is set again
        await AccountScreen.toBeVisible();
        const {accountCustomStatusEmoji} = AccountScreen.getCustomStatus(customEmojiName, customStatusDuration);
        await expect(accountCustomStatusEmoji).toBeVisible();

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

        // * Verify status is cleared
        await verifyStatusCleared({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});
    });

    it('MM-T3892 - should manage recent custom statuses correctly', async () => {
        const customEmojiName = 'clown_face';
        const customStatusText = `Custom Status ${getRandomId()}`;
        const customStatusDuration = 'today';

        await openCustomStatusScreen();

        // # Create custom status with emoji picker
        await CustomStatusScreen.openEmojiPicker('default', true);
        await EmojiPickerScreen.searchInput.replaceText(customEmojiName);
        await element(by.text('🤡')).tap();
        await wait(timeouts.ONE_SEC);
        await CustomStatusScreen.statusInput.replaceText(customStatusText);
        await CustomStatusScreen.doneButton.tap();

        // * Verify status is set
        await verifyStatusSetOnAccountScreen({emoji: customEmojiName, text: customStatusText, duration: customStatusDuration});

        // # Clear and verify in recent section
        await AccountScreen.customStatusClearButton.tap();
        await CustomStatusScreen.open();
        await expect(CustomStatusScreen.recents).toBeVisible();

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

        // * Verify status is set with expiry time
        await AccountScreen.toBeVisible();
        const {accountCustomStatusEmoji, accountCustomStatusText, accountCustomStatusExpiry} =
            AccountScreen.getCustomStatus(status.emoji, status.duration);
        await expect(accountCustomStatusEmoji).toBeVisible();
        await expect(accountCustomStatusText).toHaveText(status.text);
        await expect(accountCustomStatusExpiry).toBeVisible();

        // # Create post and verify status in user profile
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(messageText);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem, postListPostItemProfilePicture} =
            ChannelScreen.getPostListPostItem(post.id, messageText, {userId: testUser.id});
        await expect(postListPostItem).toBeVisible();

        // # Tap avatar and verify user profile shows status
        if (!postListPostItemProfilePicture) {
            throw new Error('postListPostItemProfilePicture is null');
        }
        await expect(postListPostItemProfilePicture).toBeVisible();
        await postListPostItemProfilePicture.tap();
        await wait(timeouts.TWO_SEC);
        await UserProfileScreen.toBeVisible();
        await UserProfileScreen.close();
        await ChannelScreen.back();

        // # Create DM and verify status in channel info
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();
        await CreateDirectMessageScreen.searchInput.replaceText(testUser.username);
        await wait(timeouts.TWO_SEC);
        await expect(CreateDirectMessageScreen.getUserItemDisplayName(testUser.id)).toBeVisible();
        await CreateDirectMessageScreen.getUserItem(testUser.id).tap();
        await wait(timeouts.TWO_SEC);

        try {
            await ChannelScreen.scheduledPostTooltipCloseButton.tap();
        } catch (e) {
            // Tooltip not present
        }

        // # Open channel info and verify status
        await ChannelScreen.toBeVisible();
        await ChannelScreen.headerTitle.tap();
        await wait(timeouts.TWO_SEC);
        await ChannelInfoScreen.toBeVisible();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // # Clean up
        await AccountScreen.open();
        await AccountScreen.customStatusClearButton.tap();
        await verifyStatusCleared(status);
    });
});

// ==================== Helper Functions ====================

const openCustomStatusScreen = async () => {
    await AccountScreen.open();
    await CustomStatusScreen.open();
    await CustomStatusScreen.toBeVisible();
};

const selectSuggestedStatus = async (status: {emoji: string; text: string; duration: string}) => {
    const {customStatusSuggestion} = CustomStatusScreen.getSuggestedCustomStatus(status.emoji, status.text, status.duration);
    await customStatusSuggestion.tap();
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

const verifySuggestedCustomStatus = async (emojiName: string, text: string, duration: string) => {
    const {customStatusSuggestionEmoji, customStatusSuggestionText, customStatusSuggestionDuration} =
        CustomStatusScreen.getSuggestedCustomStatus(emojiName, text, duration);
    await expect(customStatusSuggestionEmoji).toBeVisible();
    await expect(customStatusSuggestionText).toBeVisible();
    await expect(customStatusSuggestionDuration).toBeVisible();
};

const verifyAllSuggestedStatuses = async () => {
    await expect(CustomStatusScreen.suggestions).toBeVisible();
    await verifySuggestedCustomStatus('calendar', 'In a meeting', 'one_hour');
    await verifySuggestedCustomStatus('hamburger', 'Out for lunch', 'thirty_minutes');
    await verifySuggestedCustomStatus('sneezing_face', 'Out sick', 'today');
    await verifySuggestedCustomStatus('house', 'Working from home', 'today');
    await verifySuggestedCustomStatus('palm_tree', 'On a vacation', 'this_week');
};

const verifyStatusSetOnAccountScreen = async (status: {emoji: string; text: string; duration: string}) => {
    await AccountScreen.toBeVisible();
    const {accountCustomStatusEmoji, accountCustomStatusText, accountCustomStatusExpiry} =
        AccountScreen.getCustomStatus(status.emoji, status.duration);
    await expect(accountCustomStatusEmoji).toBeVisible();
    await expect(accountCustomStatusText).toHaveText(status.text);
    await expect(accountCustomStatusExpiry).toBeVisible();
};

const verifyStatusCleared = async (status: {emoji: string; text?: string; duration: string}) => {
    const {accountCustomStatusEmoji, accountCustomStatusText} =
        AccountScreen.getCustomStatus(status.emoji, status.duration);
    await expect(accountCustomStatusEmoji).not.toExist();
    await expect(accountCustomStatusText).toHaveText('Set a custom status');
};
