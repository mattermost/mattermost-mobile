// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
    ProfilePicture,
} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
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
        await waitFor(this.channelInfoScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelInfoScreen;
    };

    open = async () => {
        // # Open channel info screen
        await waitFor(ChannelScreen.headerTitle).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.headerTitle.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.channelInfoScreen).not.toBeVisible();
    };

    openChannelSettings = async () => {
        await waitFor(this.channelSettingsOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.channelSettingsOption.tap({x: 1, y: 1});
    };

    leaveChannel = async ({confirm = true} = {}) => {
        await this.scrollView.tap({x: 1, y: 1});
        await this.scrollView.scroll(200, 'down');
        await waitFor(this.leaveChannelOption).toExist().withTimeout(timeouts.TWO_SEC);
        if (isAndroid()) {
            await this.scrollView.scrollTo('bottom');
        }
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
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).not.toExist();
        } else {
            await cancelButton.tap();
            await wait(timeouts.ONE_SEC);
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
        await waitFor(element(by.id('channel_info.extra.header.bottom_sheet.copy_header_text'))).
            toBeVisible().
            withTimeout(timeouts.TWO_SEC);

        // Tap copy option (actual copy action)
        await element(by.id('channel_info.extra.header.bottom_sheet.copy_header_text')).tap();
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
        await waitFor(element(by.id('channel_info.title.public_private.bottom_sheet.copy_purpose'))).
            toBeVisible().
            withTimeout(timeouts.TWO_SEC);

        // Tap copy option
        await element(by.id('channel_info.title.public_private.bottom_sheet.copy_purpose')).tap();
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
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
