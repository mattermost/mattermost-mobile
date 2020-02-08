// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import Autocomplete, {AUTOCOMPLETE_MAX_HEIGHT} from 'app/components/autocomplete';
import InteractiveDialogController from 'app/components/interactive_dialog_controller';
import MainSidebar from 'app/components/sidebars/main';
import NetworkIndicator from 'app/components/network_indicator';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import SettingsSidebar from 'app/components/sidebars/settings';
import StatusBar from 'app/components/status_bar';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import LocalConfig from 'assets/config';

import ChannelBase, {ClientUpgradeListener} from './channel_base';
import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

const ACCESSORIES_CONTAINER_NATIVE_ID = 'channelAccessoriesContainer';
const CHANNEL_POST_TEXTBOX_CURSOR_CHANGE = 'onChannelTextBoxCursorChange';
const CHANNEL_POST_TEXTBOX_VALUE_CHANGE = 'onChannelTextBoxValueChange';

export default class ChannelIOS extends ChannelBase {
    mainSidebarRef = (ref) => {
        if (ref) {
            this.mainSidebar = ref;
        }
    };

    settingsSidebarRef = (ref) => {
        if (ref) {
            this.settingsSidebar = ref;
        }
    };

    openMainSidebar = () => {
        if (this.mainSidebar) {
            this.mainSidebar.open();
        }
    };

    openSettingsSidebar = () => {
        if (this.settingsSidebar) {
            this.settingsSidebar.open();
        }
    };

    render() {
        const {currentChannelId, theme} = this.props;

        const channelLoadingOrFailed = this.renderLoadingOrFailedChannel();
        if (channelLoadingOrFailed) {
            return channelLoadingOrFailed;
        }

        const style = getStyle(theme);
        const drawerContent = (
            <>
                <SafeAreaView>
                    <StatusBar/>
                    <NetworkIndicator/>
                    <ChannelNavBar
                        openMainSidebar={this.openMainSidebar}
                        openSettingsSidebar={this.openSettingsSidebar}
                        onPress={this.goToChannelInfo}
                    />
                    <ChannelPostList
                        updateNativeScrollView={this.updateNativeScrollView}
                    />
                    <View nativeID={ACCESSORIES_CONTAINER_NATIVE_ID}>
                        <Autocomplete
                            maxHeight={AUTOCOMPLETE_MAX_HEIGHT}
                            onChangeText={this.handleAutoComplete}
                            cursorPositionEvent={CHANNEL_POST_TEXTBOX_CURSOR_CHANGE}
                            valueEvent={CHANNEL_POST_TEXTBOX_VALUE_CHANGE}
                        />
                    </View>
                    {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener/>}
                </SafeAreaView>
                <KeyboardTrackingView
                    ref={this.keyboardTracker}
                    scrollViewNativeID={currentChannelId}
                    accessoriesContainerID={ACCESSORIES_CONTAINER_NATIVE_ID}
                >
                    <PostTextbox
                        cursorPositionEvent={CHANNEL_POST_TEXTBOX_CURSOR_CHANGE}
                        valueEvent={CHANNEL_POST_TEXTBOX_VALUE_CHANGE}
                        ref={this.postTextbox}
                        screenId={this.props.componentId}
                    />
                </KeyboardTrackingView>
            </>
        );

        return (
            <MainSidebar ref={this.mainSidebarRef}>
                <SettingsSidebar ref={this.settingsSidebarRef}>
                    <View style={style.backdrop}>
                        {drawerContent}
                    </View>
                </SettingsSidebar>
                <InteractiveDialogController
                    theme={theme}
                />
            </MainSidebar>
        );
    }
}

export const getStyle = makeStyleSheetFromTheme((theme) => ({
    backdrop: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    flex: {
        flex: 1,
    },
}));