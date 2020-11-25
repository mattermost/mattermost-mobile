// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CameraQuickAction,
    FileQuickAction,
    ImageQuickAction,
    InputQuickAction,
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
        channelScreenPrefix: 'channel.',
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
    atInputQuickAction = InputQuickAction.getAtInputQuickAction(this.testID.channelScreenPrefix);
    atInputQuickActionDisabled = InputQuickAction.getAtInputQuickActionDisabled(this.testID.channelScreenPrefix);
    slashInputQuickAction = InputQuickAction.getSlashInputQuickAction(this.testID.channelScreenPrefix);
    slashInputQuickActionDisabled = InputQuickAction.getSlashInputQuickActionDisabled(this.testID.channelScreenPrefix);
    fileQuickAction = FileQuickAction.getFileQuickAction(this.testID.channelScreenPrefix);
    fileQuickActionDisabled = FileQuickAction.getFileQuickActionDisabled(this.testID.channelScreenPrefix);
    imageQuickAction = ImageQuickAction.getImageQuickAction(this.testID.channelScreenPrefix);
    imageQuickActionDisabled = ImageQuickAction.getImageQuickActionDisabled(this.testID.channelScreenPrefix);
    cameraQuickAction = CameraQuickAction.getCameraQuickAction(this.testID.channelScreenPrefix);
    cameraQuickActionDisabled = CameraQuickAction.getCameraQuickActionDisabled(this.testID.channelScreenPrefix);
    postDraft = PostDraft.getPostDraft(this.testID.channelScreenPrefix);
    postDraftArchived = PostDraft.getPostDraftArchived(this.testID.channelScreenPrefix);
    postDraftReadOnly = PostDraft.getPostDraftReadOnly(this.testID.channelScreenPrefix);
    postInput = PostDraft.getPostInput(this.testID.channelScreenPrefix);
    sendButton = SendButton.getSendButton(this.testID.channelScreenPrefix);
    sendButtonDisabled = SendButton.getSendButtonDisabled(this.testID.channelScreenPrefix);

    getLongPostPostItem = (postId, text) => {
        return LongPostScreen.getPost(postId, text);
    }

    getPostListPostItem = (postId, text) => {
        return PostListScreen.getPost(this.testID.channelScreenPrefix, postId, text);
    }

    toBeVisible = async () => {
        await expect(this.channelScreen).toBeVisible();

        return this.channelScreen;
    }

    open = async (user) => {
        // # Open channel screen
        await LoginScreen.open();
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
        const {postListPostItem} = await this.getPostListPostItem(postId, text);
        await expect(postListPostItem).toBeVisible();

        // # Open post options
        await postListPostItem.longPress();
        await PostOptions.toBeVisible();
    }

    postMessage = async (message) => {
        // # Post message
        await this.postInput.tap();
        await this.postInput.typeText(message);
        await this.tapSendButton();
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
