// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {ChannelScreen} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';

class ChannelInfoScreen {
    testID = {
        channelInfoScreen: 'channel_info.screen',
        channelInfoScrollView: 'channel_info.scroll_view',
        closeChannelInfoButton: 'close.channel_info.button',
        channelIconGMMemberCount: 'channel_info.header.channel_icon.gm_member_count',
        channelDisplayName: 'channel_info.header.display_name',
        channelHeader: 'channel_info.header.header',
        channelPurpose: 'channel_info.header.purpose',
        headerCustomStatus: 'channel_info.header.custom_status',
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
    channelIconGMMemberCount = element(by.id(this.testID.channelIconGMMemberCount));
    channelDisplayName = element(by.id(this.testID.channelDisplayName));
    channelHeader = element(by.id('markdown_text').withAncestor(by.id(this.testID.channelHeader)));
    channelPurpose = element(by.id(this.testID.channelPurpose));
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

    archiveChannel = async ({confirm = true, publicChannel = true, description = null} = {}) => {
        await this.channelInfoScrollView.scrollTo('bottom');
        await this.archiveAction.tap();
        const {
            archivePrivateChannelTitle,
            archivePublicChannelTitle,
            noButton,
            yesButton,
        } = Alert;
        if (publicChannel) {
            await expect(archivePublicChannelTitle).toBeVisible();
        } else {
            await expect(archivePrivateChannelTitle).toBeVisible();
        }
        if (description) {
            const descriptionElement = isAndroid() ? element(by.text(description)) : element(by.label(description)).atIndex(0);
            await expect(descriptionElement).toBeVisible();
        }
        await expect(noButton).toBeVisible();
        await expect(yesButton).toBeVisible();
        if (confirm) {
            yesButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).not.toBeVisible();
        } else {
            noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).toBeVisible();
        }
    }

    leaveChannel = async ({confirm = true, publicChannel = true, description = null} = {}) => {
        await this.channelInfoScrollView.scrollTo('bottom');
        await this.leaveAction.tap();
        const {
            leavePrivateChannelTitle,
            leavePublicChannelTitle,
            noButton,
            yesButton,
        } = Alert;
        if (publicChannel) {
            await expect(leavePublicChannelTitle).toBeVisible();
        } else {
            await expect(leavePrivateChannelTitle).toBeVisible();
        }
        if (description) {
            const descriptionElement = isAndroid() ? element(by.text(description)) : element(by.label(description)).atIndex(0);
            await expect(descriptionElement).toBeVisible();
        }
        await expect(noButton).toBeVisible();
        await expect(yesButton).toBeVisible();
        if (confirm) {
            yesButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).not.toBeVisible();
        } else {
            noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelInfoScreen).toBeVisible();
        }
    }
}

const channelInfoScreen = new ChannelInfoScreen();
export default channelInfoScreen;
