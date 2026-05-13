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
        configurationOption: 'channel_settings.configuration.option',
        convertPrivateOption: 'channel_settings.convert_private.option',
        archiveChannelOption: 'channel_settings.archive_channel.option',
        unarchiveChannelOption: 'channel_settings.unarchive_channel.option',
        shareWithConnectedWorkspacesOption: 'channel_settings.share_with_connected_workspaces.option',
    };

    channelSettingsScreen = element(by.id(this.testID.channelSettingsScreen));
    closeButton = element(by.id(this.testID.closeButton));
    scrollView = element(by.id(this.testID.scrollView));
    channelInfoOption = element(by.id(this.testID.channelInfoOption));
    configurationOption = element(by.id(this.testID.configurationOption));
    convertPrivateOption = element(by.id(this.testID.convertPrivateOption));
    archiveChannelOption = element(by.id(this.testID.archiveChannelOption));
    unarchiveChannelOption = element(by.id(this.testID.unarchiveChannelOption));
    shareWithConnectedWorkspacesOption = element(by.id(this.testID.shareWithConnectedWorkspacesOption));

    toBeVisible = async () => {
        await waitFor(this.channelSettingsScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.channelSettingsScreen;
    };

    close = async () => {
        await waitFor(this.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.closeButton.tap();
        await waitFor(this.channelSettingsScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    openConfiguration = async () => {
        await waitFor(this.configurationOption).toBeVisible().whileElement(by.id(this.testID.scrollView)).scroll(50, 'down');
        await this.configurationOption.tap({x: 1, y: 1});
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

            // Wait for the alert to be fully dismissed before proceeding — a fixed sleep
            // is insufficient on slow iOS CI runners where the dismiss animation can take
            // longer, leaving the dimming view blocking subsequent taps.
            await waitFor(alertArchiveChannelTitle).not.toExist().withTimeout(timeouts.TEN_SEC);
            await expect(this.channelSettingsScreen).not.toExist();
        } else {
            await noButton.tap();
            await waitFor(alertArchiveChannelTitle).not.toExist().withTimeout(timeouts.TEN_SEC);
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

        // Scroll down to reveal the convert option. The scroll can fail with
        // "Unable to scroll" if the settings content is short enough to fit
        // without scrolling (e.g. newly created channel with no custom settings).
        try {
            await this.scrollView.scroll(100, 'down');
        } catch { /* content may already fit without scrolling */ }
        await waitFor(this.convertPrivateOption).toBeVisible().whileElement(by.id(this.testID.scrollView)).scroll(50, 'down');
        await this.convertPrivateOption.tap({x: 1, y: 1});
        const {
            channelNowPrivateTitle,
            convertToPrivateChannelTitle,
            noButton2,
            okButton,
            yesButton2,
        } = Alert;
        const convertTitle = convertToPrivateChannelTitle(channelDisplayName);
        await expect(convertTitle).toBeVisible();
        await expect(noButton2).toBeVisible();
        await expect(yesButton2).toBeVisible();
        if (confirm) {
            await yesButton2.tap();

            // Wait for the first alert to dismiss and the "now private" confirmation to appear
            await waitFor(convertTitle).not.toExist().withTimeout(timeouts.TEN_SEC);
            const nowPrivateTitle = channelNowPrivateTitle(channelDisplayName);
            await expect(nowPrivateTitle).toBeVisible();
            await okButton.tap();

            // Wait for the confirmation alert to be fully dismissed before proceeding — a fixed
            // sleep is insufficient on slow iOS CI runners where the UIAlertController dimming
            // view can block subsequent taps on the channel list header plus button.
            await waitFor(nowPrivateTitle).not.toExist().withTimeout(timeouts.TEN_SEC);
            await expect(this.channelSettingsScreen).toExist();
        } else {
            await noButton2.tap();
            await waitFor(convertTitle).not.toExist().withTimeout(timeouts.TEN_SEC);
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

            // Wait for the alert to be fully dismissed before proceeding — a fixed sleep
            // is insufficient on slow iOS CI runners where the dismiss animation can take
            // longer, leaving the dimming view blocking subsequent taps.
            await waitFor(alertUnarchiveChannelTitle).not.toExist().withTimeout(timeouts.TEN_SEC);
            await expect(this.channelSettingsScreen).not.toExist();
        } else {
            await noButton.tap();
            await waitFor(alertUnarchiveChannelTitle).not.toExist().withTimeout(timeouts.TEN_SEC);
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
