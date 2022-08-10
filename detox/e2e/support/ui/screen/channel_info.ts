// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
    ProfilePicture,
} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class ChannelInfoScreen {
    testID = {
        directMessageTitlePrefix: 'channel_info.title.direct_message.',
        channelInfoScreen: 'channel_info.screen',
        closeButton: 'close.channel_info.button',
        scrollView: 'channel_info.scrollview',
        groupMessageTitleDisplayName: 'channel_info.title.group_message.display_name',
        publicPrivateTitleDisplayName: 'channel_info.title.public_private.display_name',
        publicPrivateTitlePurpose: 'channel_info.title.public_private.purpose',
        favoriteAction: 'channel_info.channel_actions.favorite.action',
        unfavoriteAction: 'channel_info.channel_actions.unfavorite.action',
        muteAction: 'channel_info.channel_actions.mute.action',
        unmuteAction: 'channel_info.channel_actions.unmute.action',
        setHeaderAction: 'channel_info.channel_actions.set_header.action',
        addPeopleAction: 'channel_info.channel_actions.add_people.action',
        copyChannelLinkAction: 'channel_info.channel_actions.copy_channel_link.action',
        extraHeader: 'channel_info.extra.header',
        extraCreatedBy: 'channel_info.extra.created_by',
        extraCreatedOn: 'channel_info.extra.created_on',
        ignoreMentionsOptionToggledOff: 'channel_info.options.ignore_mentions.option.toggled.false',
        ignoreMentionsOptionToggledOn: 'channel_info.options.ignore_mentions.option.toggled.true',
        notificationPreferenceOption: 'channel_info.options.notification_preference.option',
        pinnedMessagesOption: 'channel_info.options.pinned_messages.option',
        membersOption: 'channel_info.options.members.option',
        editChannelOption: 'channel_info.options.edit_channel.option',
        convertPrivateOption: 'channel_info.options.convert_private.option',
        leaveChannelOption: 'channel_info.options.leave_channel.option',
        archiveChannelOption: 'channel_info.options.archive_channel.option',
        unarchiveChannelOption: 'channel_info.options.unarchive_channel.option',
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
    addPeopleAction = element(by.id(this.testID.addPeopleAction));
    copyChannelLinkAction = element(by.id(this.testID.copyChannelLinkAction));
    extraHeader = element(by.id(this.testID.extraHeader));
    extraCreatedBy = element(by.id(this.testID.extraCreatedBy));
    extraCreatedOn = element(by.id(this.testID.extraCreatedOn));
    ignoreMentionsOptionToggledOff = element(by.id(this.testID.ignoreMentionsOptionToggledOff));
    ignoreMentionsOptionToggledOn = element(by.id(this.testID.ignoreMentionsOptionToggledOn));
    notificationPreferenceOption = element(by.id(this.testID.notificationPreferenceOption));
    pinnedMessagesOption = element(by.id(this.testID.pinnedMessagesOption));
    membersOption = element(by.id(this.testID.membersOption));
    editChannelOption = element(by.id(this.testID.editChannelOption));
    convertPrivateOption = element(by.id(this.testID.convertPrivateOption));
    leaveChannelOption = element(by.id(this.testID.leaveChannelOption));
    archiveChannelOption = element(by.id(this.testID.archiveChannelOption));
    unarchiveChannelOption = element(by.id(this.testID.unarchiveChannelOption));

    getDirectMessageTitle = async (userId: string) => {
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
        await ChannelScreen.headerTitle.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.channelInfoScreen).not.toBeVisible();
    };

    archiveChannel = async (alertArchiveChannelTitle: Detox.NativeElement, {confirm = true} = {}) => {
        await this.scrollView.scrollTo('bottom');
        await waitFor(this.archiveChannelOption).toExist().withTimeout(timeouts.TWO_SEC);
        await this.archiveChannelOption.tap({x: 1, y: 1});
        const {
            noButton,
            yesButton,
        } = Alert;
        await expect(alertArchiveChannelTitle).toBeVisible();
        await expect(noButton).toBeVisible();
        await expect(yesButton).toBeVisible();
        if (confirm) {
            await yesButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).not.toExist();
        } else {
            await noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).toExist();
        }
    };

    archivePrivateChannel = async ({confirm = true} = {}) => {
        await this.archiveChannel(Alert.archivePrivateChannelTitle, {confirm});
    };

    archivePublicChannel = async ({confirm = true} = {}) => {
        await this.archiveChannel(Alert.archivePublicChannelTitle, {confirm});
    };

    convertToPrivateChannel = async (channelDisplayName: string, {confirm = true} = {}) => {
        await this.scrollView.scrollTo('bottom');
        await waitFor(this.convertPrivateOption).toExist().withTimeout(timeouts.TWO_SEC);
        await this.convertPrivateOption.tap({x: 1, y: 1});
        const {
            convertToPrivateChannelTitle,
            noButton,
            yesButton,
        } = Alert;
        await expect(convertToPrivateChannelTitle(channelDisplayName)).toBeVisible();
        await expect(noButton).toBeVisible();
        await expect(yesButton).toBeVisible();
        if (confirm) {
            await yesButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).not.toExist();
        } else {
            await noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).toExist();
        }
    };

    leaveChannel = async ({confirm = true} = {}) => {
        await this.scrollView.scrollTo('bottom');
        await waitFor(this.leaveChannelOption).toExist().withTimeout(timeouts.TWO_SEC);
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

    unarchiveChannel = async (alertUnarchiveChannelTitle: Detox.NativeElement, {confirm = true} = {}) => {
        await this.scrollView.scrollTo('bottom');
        await waitFor(this.unarchiveChannelOption).toExist().withTimeout(timeouts.TWO_SEC);
        await this.unarchiveChannelOption.tap({x: 1, y: 1});
        const {
            noButton,
            yesButton,
        } = Alert;
        await expect(alertUnarchiveChannelTitle).toBeVisible();
        await expect(noButton).toBeVisible();
        await expect(yesButton).toBeVisible();
        if (confirm) {
            await yesButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).not.toExist();
        } else {
            await noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).toExist();
        }
    };

    unarchivePrivateChannel = async ({confirm = true} = {}) => {
        await this.unarchiveChannel(Alert.unarchivePrivateChannelTitle, {confirm});
    };

    unarchivePublicChannel = async ({confirm = true} = {}) => {
        await this.unarchiveChannel(Alert.unarchivePublicChannelTitle, {confirm});
    };
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
