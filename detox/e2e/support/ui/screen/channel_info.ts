// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
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
        muteAction: 'channel_info.channel_actions.mute.action',
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
    };

    channelInfoScreen = element(by.id(this.testID.channelInfoScreen));
    closeButton = element(by.id(this.testID.closeButton));
    scrollView = element(by.id(this.testID.scrollView));
    groupMessageTitleDisplayName = element(by.id(this.testID.groupMessageTitleDisplayName));
    publicPrivateTitleDisplayName = element(by.id(this.testID.publicPrivateTitleDisplayName));
    publicPrivateTitlePurpose = element(by.id(this.testID.publicPrivateTitlePurpose));
    favoriteAction = element(by.id(this.testID.favoriteAction));
    muteAction = element(by.id(this.testID.muteAction));
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

    toggleIgnoreMentionsOptionOn = async () => {
        await this.ignoreMentionsOptionToggledOff.tap();
        await expect(this.ignoreMentionsOptionToggledOn).toBeVisible();
    };

    toggleIgnoreMentionsOff = async () => {
        await this.ignoreMentionsOptionToggledOn.tap();
        await expect(this.ignoreMentionsOptionToggledOff).toBeVisible();
    };
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
