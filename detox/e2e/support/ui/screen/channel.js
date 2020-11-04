// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsSidebar} from '@support/ui/component';
import {LoginScreen, SelectServerScreen} from '@support/ui/screen';

class ChannelScreen {
    testID = {
        channelScreen: 'channel.screen',
        channelDrawerButton: 'channel_drawer.button',
        channelIntro: 'channel_intro.beginning.text',
        channelNavBarTitle: 'channel.nav_bar.title',
        channelSearchButton: 'channel.search.button',
        channelTitleButton: 'channel.title.button',
        disabledSendButton: 'disabled_send.button',
        postInput: 'post.input',
        sendButton: 'send.button',
        settingsDrawerButton: 'settings_drawer.button',
    }

    channelScreen = element(by.id(this.testID.channelScreen));
    channelDrawerButton = element(by.id(this.testID.channelDrawerButton));
    channelIntro = element(by.id(this.testID.channelIntro));
    channelNavBarTitle = element(by.id(this.testID.channelNavBarTitle));
    channelSearchButton = element(by.id(this.testID.channelSearchButton));
    channelTitleButton = element(by.id(this.testID.channelTitleButton));
    disabledSendButton = element(by.id(this.testID.disabledSendButton));
    postInput = element(by.id(this.testID.postInput));
    sendButton = element(by.id(this.testID.sendButton));
    settingsDrawerButton = element(by.id(this.testID.settingsDrawerButton));

    toBeVisible = async () => {
        await expect(this.channelScreen).toBeVisible();

        return this.channelScreen;
    }

    open = async (user) => {
        await SelectServerScreen.connectToServer();
        await LoginScreen.login(user);

        return this.toBeVisible();
    }

    logout = async () => {
        await this.settingsDrawerButton.tap();
        await SettingsSidebar.logoutAction.tap();
        await SelectServerScreen.toBeVisible();
    }
}

const channelScreen = new ChannelScreen();
export default channelScreen;
