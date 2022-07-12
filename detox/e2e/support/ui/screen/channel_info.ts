// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ChannelInfoScreen {
    testID = {
        channelInfoScreen: 'channel_info.screen',
        closeButton: 'close.channel_info.button',
        scrollView: 'channel_info.scrollview',
        favoriteAction: 'channel_info.channel_actions.favorite.action',
        muteAction: 'channel_info.channel_actions.mute.action',
        setHeaderAction: 'channel_info.channel_actions.set_header.action',
        addPeopleAction: 'channel_info.channel_actions.add_people.action',
        copyChannelLinkAction: 'channel_info.channel_actions.copy_channel_link.action',
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
    favoriteAction = element(by.id(this.testID.favoriteAction));
    muteAction = element(by.id(this.testID.muteAction));
    setHeaderAction = element(by.id(this.testID.setHeaderAction));
    addPeopleAction = element(by.id(this.testID.addPeopleAction));
    copyChannelLinkAction = element(by.id(this.testID.copyChannelLinkAction));
    ignoreMentionsOptionToggledOff = element(by.id(this.testID.ignoreMentionsOptionToggledOff));
    ignoreMentionsOptionToggledOn = element(by.id(this.testID.ignoreMentionsOptionToggledOn));
    notificationPreferenceOption = element(by.id(this.testID.notificationPreferenceOption));
    pinnedMessagesOption = element(by.id(this.testID.pinnedMessagesOption));
    membersOption = element(by.id(this.testID.membersOption));
    editChannelOption = element(by.id(this.testID.editChannelOption));
    convertPrivateOption = element(by.id(this.testID.convertPrivateOption));
    leaveChannelOption = element(by.id(this.testID.leaveChannelOption));
    archiveChannelOption = element(by.id(this.testID.archiveChannelOption));

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
