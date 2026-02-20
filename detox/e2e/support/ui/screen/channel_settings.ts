// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    Alert,
} from '@support/ui/component';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class ChannelSettingsScreen {
    testID = {
        channelSettingsScreen: 'channel_settings.screen',
        closeButton: 'screen.back.button',
        scrollView: 'channel_settings.scroll_view',
        channelInfoOption: 'channel_settings.channel_info.option',
        convertPrivateOption: 'channel_settings.convert_private.option',
        archiveChannelOption: 'channel_settings.archive_channel.option',
        unarchiveChannelOption: 'channel_settings.unarchive_channel.option',
        channelAutotranslationOptionToggledOn: 'channel_settings.channel_autotranslation.option.toggled.true',
        channelAutotranslationOptionToggledOff: 'channel_settings.channel_autotranslation.option.toggled.false',
        channelAutotranslationToggleOnButton: 'channel_settings.channel_autotranslation.option.toggled.true.toggled.true.button',
        channelAutotranslationToggleOffButton: 'channel_settings.channel_autotranslation.option.toggled.false.toggled.false.button',
    };

    channelSettingsScreen = element(by.id(this.testID.channelSettingsScreen));
    closeButton = element(by.id(this.testID.closeButton));
    scrollView = element(by.id(this.testID.scrollView));
    channelInfoOption = element(by.id(this.testID.channelInfoOption));
    convertPrivateOption = element(by.id(this.testID.convertPrivateOption));
    archiveChannelOption = element(by.id(this.testID.archiveChannelOption));
    unarchiveChannelOption = element(by.id(this.testID.unarchiveChannelOption));
    channelAutotranslationOptionToggledOn = element(by.id(this.testID.channelAutotranslationOptionToggledOn));
    channelAutotranslationOptionToggledOff = element(by.id(this.testID.channelAutotranslationOptionToggledOff));
    channelAutotranslationToggleOnButton = element(by.id(this.testID.channelAutotranslationToggleOnButton));
    channelAutotranslationToggleOffButton = element(by.id(this.testID.channelAutotranslationToggleOffButton));

    toBeVisible = async () => {
        await waitFor(this.channelSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelSettingsScreen;
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.channelSettingsScreen).not.toBeVisible();
    };

    archiveChannel = async (alertArchiveChannelTitle: Detox.NativeElement, {confirm = true} = {}) => {
        await waitFor(this.archiveChannelOption).toBeVisible().whileElement(by.id(this.testID.scrollView)).scroll(50, 'down');
        await this.archiveChannelOption.tap({x: 1, y: 1});
        const {
            noButton,
            yesButton,
        } = Alert;
        await wait(timeouts.TWO_SEC);
        await expect(alertArchiveChannelTitle).toBeVisible();
        await expect(noButton).toBeVisible();
        await expect(yesButton).toBeVisible();
        if (confirm) {
            await yesButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelSettingsScreen).not.toExist();
        } else {
            await noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelSettingsScreen).toExist();
        }
    };

    archivePrivateChannel = async ({confirm = true} = {}) => {
        await this.archiveChannel(Alert.archivePrivateChannelTitle, {confirm});
    };

    archivePublicChannel = async ({confirm = true} = {}) => {
        await this.archiveChannel(Alert.archivePublicChannelTitle, {confirm});
    };

    convertToPrivateChannel = async (channelDisplayName: string, {confirm = true} = {}) => {
        await this.scrollView.tap({x: 1, y: 1});
        await this.scrollView.scroll(100, 'down');
        await waitFor(this.convertPrivateOption).toBeVisible().whileElement(by.id(this.testID.scrollView)).scroll(50, 'down');
        await this.convertPrivateOption.tap({x: 1, y: 1});
        const {
            channelNowPrivateTitle,
            convertToPrivateChannelTitle,
            noButton2,
            okButton,
            yesButton2,
        } = Alert;
        await expect(convertToPrivateChannelTitle(channelDisplayName)).toBeVisible();
        await expect(noButton2).toBeVisible();
        await expect(yesButton2).toBeVisible();
        if (confirm) {
            await yesButton2.tap();
            await expect(channelNowPrivateTitle(channelDisplayName)).toBeVisible();
            await okButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelSettingsScreen).toExist();
        } else {
            await noButton2.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelSettingsScreen).toExist();
        }
    };

    unarchiveChannel = async (alertUnarchiveChannelTitle: Detox.NativeElement, {confirm = true} = {}) => {
        await waitFor(this.unarchiveChannelOption).toBeVisible().whileElement(by.id(this.testID.scrollView)).scroll(50, 'down');
        await wait(timeouts.TWO_SEC);
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
            await expect(this.channelSettingsScreen).not.toExist();
        } else {
            await noButton.tap();
            await wait(timeouts.ONE_SEC);
            await expect(this.channelSettingsScreen).toExist();
        }
    };

    unarchivePrivateChannel = async ({confirm = true} = {}) => {
        await this.unarchiveChannel(Alert.unarchivePrivateChannelTitle, {confirm});
    };

    unarchivePublicChannel = async ({confirm = true} = {}) => {
        await this.unarchiveChannel(Alert.unarchivePublicChannelTitle, {confirm});
    };
}

const channelSettingsScreen = new ChannelSettingsScreen();
export default channelSettingsScreen;
