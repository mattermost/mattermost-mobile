// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CameraQuickAction,
    FileQuickAction,
    ImageQuickAction,
    MainSidebar,
    PostDraft,
    PostOptions,
    SendButton,
    SettingsSidebar,
} from '@support/ui/component';
import {
    LoginScreen,
    LongPostScreen,
    PostListScreen,
    SelectServerScreen,
} from '@support/ui/screen';

class ChannelScreen {
    testID = {
        channelScreen: 'channel.screen',
        mainSidebarDrawerButton: 'main_sidebar_drawer.button',
        channelIntro: 'channel_intro.beginning.text',
        channelNavBarTitle: 'channel.nav_bar.title',
        channelSearchButton: 'channel.search.button',
        channelTitleButton: 'channel.title.button',
        settingsSidebarDrawerButton: 'settings_sidebar_drawer.button',
    }

    channelScreen = element(by.id(this.testID.channelScreen));
    mainSidebarDrawerButton = element(by.id(this.testID.mainSidebarDrawerButton));
    channelIntro = element(by.id(this.testID.channelIntro));
    channelNavBarTitle = element(by.id(this.testID.channelNavBarTitle));
    channelSearchButton = element(by.id(this.testID.channelSearchButton));
    channelTitleButton = element(by.id(this.testID.channelTitleButton));
    settingsSidebarDrawerButton = element(by.id(this.testID.settingsSidebarDrawerButton));

    // convenience props
    cameraQuickAction = CameraQuickAction.cameraQuickAction;
    cameraQuickActionDisabled = CameraQuickAction.cameraQuickActionDisabled;
    imageQuickAction = ImageQuickAction.imageQuickAction;
    imageQuickActionDisabled = ImageQuickAction.imageQuickActionDisabled;
    fileQuickAction = FileQuickAction.fileQuickAction;
    fileQuickActionDisabled = FileQuickAction.fileQuickActionDisabled;
    postDraft = PostDraft.postDraft;
    postDraftArchived = PostDraft.postDraftArchived;
    postDraftReadOnly = PostDraft.postDraftReadOnly;
    postInput = PostDraft.postInput;
    sendButton = SendButton.sendButton;
    sendButtonDisabled = SendButton.sendButtonDisabled;

    getLongPostPostItem = (postId, text) => {
        return LongPostScreen.getPost(postId, text);
    }

    getPostListPostItem = (postId, text) => {
        return PostListScreen.getPost(postId, text);
    }

    toBeVisible = async () => {
        await expect(this.channelScreen).toBeVisible();

        return this.channelScreen;
    }

    open = async (user) => {
        // # Open channel screen
        await SelectServerScreen.connectToServer();
        await LoginScreen.login(user);

        return this.toBeVisible();
    }

    logout = async () => {
        await this.openSettingsSidebar();
        await SettingsSidebar.logoutAction.tap();
        await SelectServerScreen.toBeVisible();
    }

    openMainSidebar = async () => {
        // # Open main sidebar
        await this.mainSidebarDrawerButton.tap();
        await MainSidebar.toBeVisible();
    }

    openSettingsSidebar = async () => {
        // # Open settings sidebar
        await this.settingsSidebarDrawerButton.tap();
        await SettingsSidebar.toBeVisible();
    }

    openPostOptionsFor = async (postId, text) => {
        const post = await this.getPostListPostItem(postId, text);
        await expect(post).toBeVisible();

        // # Open post options
        await post.longPress();
        await PostOptions.toBeVisible();
    }

    tapSendButton = async () => {
        // # Tap send button
        await this.sendButton.tap();
        await expect(this.sendButton).not.toExist();
        await expect(this.sendButtonDisabled).toBeVisible();
    }
}

const channelScreen = new ChannelScreen();
export default channelScreen;
