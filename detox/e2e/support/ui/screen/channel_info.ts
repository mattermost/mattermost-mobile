// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
    ProfilePicture,
} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {isAndroid, safeEnableSynchronization, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class ChannelInfoScreen {
    testID = {
        directMessageTitlePrefix: 'channel_info.title.direct_message.',
        channelInfoScreen: 'channel_info.screen',
        closeButton: 'close.channel_info.button',
        scrollView: 'channel_info.scroll_view',
        groupMessageTitleDisplayName: 'channel_info.title.group_message.display_name',
        publicPrivateTitleDisplayName: 'channel_info.title.public_private.display_name',
        publicPrivateTitlePurpose: 'channel_info.title.public_private.purpose',
        favoriteAction: 'channel_info.channel_actions.favorite.action',
        unfavoriteAction: 'channel_info.channel_actions.unfavorite.action',
        muteAction: 'channel_info.channel_actions.mute.action',
        unmuteAction: 'channel_info.channel_actions.unmute.action',
        setHeaderAction: 'channel_info.channel_actions.set_header.action',
        addMembersAction: 'channel_info.channel_actions.add_members.action',
        copyChannelLinkAction: 'channel_info.channel_actions.copy_channel_link.action',
        joinStartCallAction: 'channel_info.channel_actions.join_start_call.action',
        extraHeader: 'channel_info.extra.header',
        extraCreatedBy: 'channel_info.extra.created_by',
        extraCreatedOn: 'channel_info.extra.created_on',
        ignoreMentionsOptionToggledOff: 'channel_info.options.ignore_mentions.option.toggled.false',
        ignoreMentionsOptionToggledOn: 'channel_info.options.ignore_mentions.option.toggled.true',
        notificationPreferenceOption: 'channel_info.options.notification_preference.option',
        pinnedMessagesOption: 'channel_info.options.pinned_messages.option',
        membersOption: 'channel_info.options.members.option',
        copyChannelLinkOption: 'channel_info.options.copy_channel_link.option',
        channelSettingsOption: 'channel_info.options.channel_settings.option',
        leaveChannelOption: 'channel_info.options.leave_channel.option',
    };

    channelInfoScreen = element(by.id(this.testID.channelInfoScreen));
    closeButton = element(by.id(this.testID.closeButton));
    scrollView = element(by.id(this.testID.scrollView));
    groupMessageTitleDisplayName = element(by.id(this.testID.groupMessageTitleDisplayName));
    publicPrivateTitleDisplayName = element(by.id(this.testID.publicPrivateTitleDisplayName));
    publicPrivateTitlePurpose = element(by.id(this.testID.publicPrivateTitlePurpose));
    favoriteAction = element(by.id(this.testID.favoriteAction));
    unfavoriteAction = element(by.id(this.testID.unfavoriteAction));
    muteAction = element(by.id(this.testID.muteAction));
    unmuteAction = element(by.id(this.testID.unmuteAction));
    setHeaderAction = element(by.id(this.testID.setHeaderAction));
    addMembersAction = element(by.id(this.testID.addMembersAction));
    copyChannelLinkAction = element(by.id(this.testID.copyChannelLinkAction));
    joinStartCallAction = element(by.id(this.testID.joinStartCallAction));
    extraHeader = element(by.id(this.testID.extraHeader));
    extraCreatedBy = element(by.id(this.testID.extraCreatedBy));
    extraCreatedOn = element(by.id(this.testID.extraCreatedOn));
    ignoreMentionsOptionToggledOff = element(by.id(this.testID.ignoreMentionsOptionToggledOff));
    ignoreMentionsOptionToggledOn = element(by.id(this.testID.ignoreMentionsOptionToggledOn));
    notificationPreferenceOption = element(by.id(this.testID.notificationPreferenceOption));
    pinnedMessagesOption = element(by.id(this.testID.pinnedMessagesOption));
    membersOption = element(by.id(this.testID.membersOption));
    copyChannelLinkOption = element(by.id(this.testID.copyChannelLinkOption));
    channelSettingsOption = element(by.id(this.testID.channelSettingsOption));
    leaveChannelOption = element(by.id(this.testID.leaveChannelOption));

    getDirectMessageTitle = (userId: string) => {
        const directMessageTitleTestId = `${this.testID.directMessageTitlePrefix}${userId}`;
        const directMessageTitleProfilePictureMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.directMessageTitlePrefix, userId);
        const directMessageTitleUserDisplayNameMatcher = by.id(`${directMessageTitleTestId}.display_name`);
        const directMessageTitleGuestTagMatcher = by.id(`${directMessageTitleTestId}.guest.tag`);
        const directMessageTitleBotTagMatcher = by.id(`${directMessageTitleTestId}.bot.tag`);
        const directMessageTitlePositionMatcher = by.id(`${directMessageTitleTestId}.position`);
        const directMessageTitleBotDescriptionMatcher = by.id(`${directMessageTitleTestId}.bot_description`);

        return {
            directMessageTitleProfilePicture: element(directMessageTitleProfilePictureMatcher),
            directMessageTitleUserDisplayName: element(directMessageTitleUserDisplayNameMatcher),
            directMessageTitleGuestTag: element(directMessageTitleGuestTagMatcher),
            directMessageTitleBotTag: element(directMessageTitleBotTagMatcher),
            directMessageTitlePosition: element(directMessageTitlePositionMatcher),
            directMessageTitleBotDescription: element(directMessageTitleBotDescriptionMatcher),
        };
    };

    toBeVisible = async () => {
        // Use HALF_MIN for iOS (up from TEN_SEC): after unarchiving/converting a channel,
        // the navigation stack settles slowly on iOS 26.x, and the channel info screen
        // can take >10 s to appear. Use polling waitForElementToExist to avoid bridge-idle
        // sync stalls on both platforms.
        const timeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.HALF_MIN;
        await waitFor(this.channelInfoScreen).toExist().withTimeout(timeout);

        return this.channelInfoScreen;
    };

    open = async () => {
        // # Open channel info screen
        await waitFor(ChannelScreen.headerTitle).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.headerTitle.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await waitFor(this.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.closeButton.tap();
        await waitFor(this.channelInfoScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    openChannelSettings = async () => {
        await waitFor(this.channelSettingsOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.channelSettingsOption.tap({x: 1, y: 1});
    };

    leaveChannel = async ({confirm = true} = {}) => {
        await this.scrollView.tap({x: 1, y: 1});
        try {
            await this.scrollView.scroll(200, 'down');
        } catch {
            // Content may not require scrolling; proceed
        }
        await waitFor(this.leaveChannelOption).toExist().withTimeout(timeouts.TWO_SEC);
        await this.scrollView.scrollTo('bottom');
        await this.leaveChannelOption.tap({x: 1, y: 1});
        const {
            leaveChannelTitle,
            cancelButton,
            leaveButton,
        } = Alert;
        await expect(leaveChannelTitle).toBeVisible();
        await expect(cancelButton).toBeVisible();
        await expect(leaveButton).toBeVisible();
        if (confirm) {
            await leaveButton.tap();
            await wait(timeouts.TWO_SEC);
            await expect(this.channelInfoScreen).not.toExist();
        } else {
            await cancelButton.tap();
            await wait(timeouts.TWO_SEC);
            await expect(this.channelInfoScreen).toExist();
        }
    };

    toggleIgnoreMentionsOptionOn = async () => {
        await this.ignoreMentionsOptionToggledOff.tap();
        await expect(this.ignoreMentionsOptionToggledOn).toBeVisible();
    };

    toggleIgnoreMentionsOff = async () => {
        await this.ignoreMentionsOptionToggledOn.tap();
        await expect(this.ignoreMentionsOptionToggledOff).toBeVisible();
    };

    copyChannelHeader = async (headerText: string) => {
        // Long press on header text
        await element(by.text(headerText)).longPress();

        // Wait for bottom sheet
        const copyAction = element(by.id('channel_info.extra.header.bottom_sheet.copy_header_text'));
        await waitFor(copyAction).
            toBeVisible().
            withTimeout(timeouts.TWO_SEC);

        // Tap copy — disable sync on Android to avoid Fabric idling-resource deadlock (MM-T868/T869).
        if (isAndroid()) {
            await device.disableSynchronization();
        }
        try {
            await copyAction.tap();
            await wait(timeouts.ONE_SEC);
        } finally {
            if (isAndroid()) {
                await safeEnableSynchronization();
            }
        }
    };

    cancelCopyChannelHeader = async (headerText: string) => {
        // Long press on header text
        await element(by.text(headerText)).longPress();

        // Wait for bottom sheet
        await waitFor(element(by.id('channel_info.extra.header.bottom_sheet.copy_header_text'))).
            toBeVisible().
            withTimeout(timeouts.TWO_SEC);

        // Cancel
        await element(by.id('channel_info.extra.header.bottom_sheet.cancel')).tap();
    };

    copyChannelPurpose = async (purposeText: string) => {
        // Long press on purpose text
        await element(by.text(purposeText)).longPress();

        // Wait for bottom sheet
        const copyAction = element(by.id('channel_info.title.public_private.bottom_sheet.copy_purpose'));
        await waitFor(copyAction).
            toBeVisible().
            withTimeout(timeouts.TWO_SEC);

        if (isAndroid()) {
            await device.disableSynchronization();
        }
        try {
            await copyAction.tap();
            await wait(timeouts.ONE_SEC);
        } finally {
            if (isAndroid()) {
                await safeEnableSynchronization();
            }
        }
    };

    cancelCopyChannelPurpose = async (purposeText: string) => {
        // Long press on purpose text
        await element(by.text(purposeText)).longPress();

        // Wait for bottom sheet
        await waitFor(element(by.id('channel_info.title.public_private.bottom_sheet.copy_purpose'))).
            toBeVisible().
            withTimeout(timeouts.TWO_SEC);

        // Cancel
        await element(by.id('channel_info.title.public_private.bottom_sheet.cancel')).tap();
    };

    scrollToBookmarks = async () => {
        const bookmarksList = element(by.id('channel_info.bookmarks.list'));
        try {
            await waitForElementToExist(bookmarksList, timeouts.THREE_SEC);
            return;
        } catch {
            // Bookmarks section may be below the fold — scroll channel info.
        }

        // ponytail: increased scroll 200→300px, CI 28476574698 shows bookmarks
        // list not reached. Fixes E2E: MM-T5602/5604/5608.
        try {
            await waitFor(bookmarksList).
                toExist().
                whileElement(by.id(this.testID.scrollView)).
                scroll(300, 'down');
        } catch {
            try {
                await this.scrollView.scrollTo('bottom');
            } catch {
                // Content may not require scrolling
            }
        }
        await wait(timeouts.ONE_SEC);
    };

    tapAddBookmark = async () => {
        await this.scrollToBookmarks();

        // CI 28495858512/28514502897: button exists and is VISIBLE but
        // getGlobalVisibleRect covers <75% — partially clipped by scroll view
        // edge. Use toExist() to find it, then scroll into 75% visibility for
        // tap() which Detox requires on both platforms.
        const addBookmark = element(by.id('channel_info.add_bookmark.button'));
        const scrollViewMatcher = by.id(this.testID.scrollView);

        try {
            await waitFor(addBookmark).toExist().whileElement(scrollViewMatcher).scroll(150, 'down');
        } catch {
            /* eslint-disable no-await-in-loop -- bounded scroll: stops when row exists */
            for (let i = 0; i < 15; i++) {
                try {
                    await waitFor(addBookmark).toExist().withTimeout(timeouts.TWO_SEC);
                    break;
                } catch (e) {
                    if (i === 14) {
                        throw new Error('Add a bookmark button not found after 15 scroll attempts');
                    }
                    try {
                        await this.scrollView.scroll(150, 'down', 0.5, 0.5);
                    } catch {
                        // Scroll view at the bottom edge.
                    }
                }
            }
            /* eslint-enable no-await-in-loop */
        }

        // Scroll into 75% visibility for tap() — Detox requires it.
        try {
            await waitFor(addBookmark).toBeVisible(75).whileElement(scrollViewMatcher).scroll(100, 'down');
        } catch {
            try {
                await waitFor(addBookmark).toBeVisible(75).whileElement(scrollViewMatcher).scroll(100, 'up');
            } catch { /* at scroll edge — tap may still work */ }
        }
        await addBookmark.tap({x: 1, y: 1});
    };

    // Close/reopen channel info to re-trigger bookmark fetch when API-created
    // bookmarks are not yet in the client after beforeAll reload (CI 29935363789:
    // Add bookmark visible but pre-created titles missing from bookmarks.list).
    waitForBookmarkInChannelInfo = async (
        bookmarkMatcher: Detox.NativeMatcher,
        {
            timeout = timeouts.TWENTY_SEC,
            textFallback,
            bookmarkId,
        }: {timeout?: number; textFallback?: string; bookmarkId?: string} = {},
    ) => {
        const MAX_RETRIES = 3;
        const perAttemptTimeout = Math.ceil(timeout / MAX_RETRIES);

        /* eslint-disable no-await-in-loop -- close/reopen channel info to trigger bookmark sync */
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            await this.scrollToBookmarks();
            try {
                await waitFor(element(bookmarkMatcher)).toExist().withTimeout(perAttemptTimeout);
                return;
            } catch (error) {
                if (attempt === MAX_RETRIES) {
                    if (textFallback) {
                        const headerMatcher = by.text(textFallback).
                            withAncestor(by.id('channel_header.bookmarks.list'));
                        try {
                            await waitFor(element(headerMatcher)).toExist().withTimeout(timeouts.FIVE_SEC);
                            return;
                        } catch {
                            // Fall through to bookmarkId / original error.
                        }
                    }
                    if (bookmarkId) {
                        const headerMatcher = by.id(`channel_bookmark.${bookmarkId}`).
                            withAncestor(by.id('channel_header.bookmarks.list'));
                        try {
                            await waitFor(element(headerMatcher)).toExist().withTimeout(timeouts.FIVE_SEC);
                            return;
                        } catch {
                            // Fall through to original error.
                        }
                    }
                    throw error;
                }

                await this.close();
                await wait(timeouts.ONE_SEC);
                await this.open();
            }
        }
        /* eslint-enable no-await-in-loop */
    };
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
