// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';

class ChannelInfoScreen {
    testID = {
        channelInfoScreen: 'channel_info.screen',
        channelInfoScrollView: 'channel_info.scroll_view',
        closeChannelInfoButton: 'close.channel_info.button',
        headerChannelIconGMMemberCount: 'channel_info.header.channel_icon.gm_member_count',
        headerDisplayName: 'channel_info.header.display_name',
        favoritePreferenceAction: 'channel_info.favorite.action',
        favoriteSwitchFalse: 'channel_info.favorite.action.switch.false',
        favoriteSwitchTrue: 'channel_info.favorite.action.switch.true',
        mutePreferenceAction: 'channel_info.mute.action',
        muteSwitchFalse: 'channel_info.mute.action.switch.false',
        muteSwitchTrue: 'channel_info.mute.action.switch.true',
        ignoreMentionsPreferenceAction: 'channel_info.ignore_mentions.action',
        ignoreMentionsSwitchFalse: 'channel_info.ignore_mentions.switch.false',
        ignoreMentionsSwitchTrue: 'channel_info.ignore_mentions.switch.true',
        notificationPreferenceAction: 'channel_info.notification_preference.action',
        pinnedMessagesAction: 'channel_info.pinned_messages.action',
        manageMembersAction: 'channel_info.manage_members.action',
        addMembersAction: 'channel_info.add_members.action',
        convertPrivateAction: 'channel_info.convert_private.action',
        editChannelAction: 'channel_info.edit_channel.action',
        leaveAction: 'channel_info.leave.action',
        archiveAction: 'channel_info.archive.action',
    }

    channelInfoScreen = element(by.id(this.testID.channelInfoScreen));
    channelInfoScrollView = element(by.id(this.testID.channelInfoScrollView));
    closeChannelInfoButton = element(by.id(this.testID.closeChannelInfoButton));
    headerChannelIconGMMemberCount = element(by.id(this.testID.headerChannelIconGMMemberCount));
    headerDisplayName = element(by.id(this.testID.headerDisplayName));
    favoritePreferenceAction = element(by.id(this.testID.favoritePreferenceAction));
    favoriteSwitchFalse = element(by.id(this.testID.favoriteSwitchFalse));
    favoriteSwitchTrue = element(by.id(this.testID.favoriteSwitchTrue));
    mutePreferenceAction = element(by.id(this.testID.mutePreferenceAction));
    muteSwitchFalse = element(by.id(this.testID.muteSwitchFalse));
    muteSwitchTrue = element(by.id(this.testID.muteSwitchTrue));
    ignoreMentionsPreferenceAction = element(by.id(this.testID.ignoreMentionsPreferenceAction));
    ignoreMentionsSwitchTrue = element(by.id(this.testID.ignoreMentionsSwitchTrue));
    muteSwitchTrue = element(by.id(this.testID.muteSwitchTrue));
    notificationPreferenceAction = element(by.id(this.testID.notificationPreferenceAction));
    pinnedMessagesAction = element(by.id(this.testID.pinnedMessagesAction));
    manageMembersAction = element(by.id(this.testID.manageMembersAction));
    addMembersAction = element(by.id(this.testID.addMembersAction));
    convertPrivateAction = element(by.id(this.testID.convertPrivateAction));
    editChannelAction = element(by.id(this.testID.editChannelAction));
    leaveAction = element(by.id(this.testID.leaveAction));
    archiveAction = element(by.id(this.testID.archiveAction));

    toBeVisible = async () => {
        await wait(timeouts.TWO_SEC);
        await expect(this.channelInfoScreen).toBeVisible();

        return this.channelInfoScreen;
    }

    open = async () => {
        // # Open channel info screen
        await ChannelScreen.channelTitleButton.tap();

        return this.toBeVisible();
    }

    close = async () => {
        await wait(timeouts.TWO_SEC);
        await this.closeChannelInfoButton.tap();
        await expect(this.channelInfoScreen).not.toBeVisible();
    }

    archiveChannel = async (confirm = true) => {
        await this.channelInfoScrollView.scrollTo('bottom');
        await this.archiveAction.tap();
        const {
            archivePublicChannelTitle,
            noButton,
            yesButton,
        } = Alert;
        await expect(archivePublicChannelTitle).toBeVisible();
        if (confirm) {
            yesButton.tap();
        } else {
            noButton.tap();
        }
        await wait(timeouts.ONE_SEC);
        await expect(this.channelInfoScreen).not.toBeVisible();
    }
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
