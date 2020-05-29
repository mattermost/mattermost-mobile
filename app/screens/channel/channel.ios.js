// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import LocalConfig from '@assets/config';
import Autocomplete, {AUTOCOMPLETE_MAX_HEIGHT} from '@components/autocomplete';
import InteractiveDialogController from '@components/interactive_dialog_controller';
import NetworkIndicator from '@components/network_indicator';
import PostDraft from '@components/post_draft';
import SafeAreaView from '@components/safe_area_view';
import MainSidebar from '@components/sidebars/main';
import SettingsSidebar from '@components/sidebars/settings';
import StatusBar from '@components/status_bar';
import {ACCESSORIES_CONTAINER_NATIVE_ID, CHANNEL_POST_TEXTBOX_CURSOR_CHANGE, CHANNEL_POST_TEXTBOX_VALUE_CHANGE} from '@constants/post_draft';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelBase, {ClientUpgradeListener} from './channel_base';
import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

export default class ChannelIOS extends ChannelBase {
    handleAutoComplete = (value) => {
        if (this.postDraft?.current) {
            this.postDraft.current.handleInputQuickAction(value);
        }
    };

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
        let component = this.renderLoadingOrFailedChannel();
        let renderDraftArea = false;

        if (!component) {
            renderDraftArea = true;
            component = (
                <>
                    <ChannelPostList
                        updateNativeScrollView={this.updateNativeScrollView}
                        registerTypingAnimation={this.registerTypingAnimation}
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
                </>
            );
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
                    {component}
                </SafeAreaView>
                {renderDraftArea &&
                <KeyboardTrackingView
                    ref={this.keyboardTracker}
                    scrollViewNativeID={currentChannelId}
                    accessoriesContainerID={ACCESSORIES_CONTAINER_NATIVE_ID}
                >
                    <PostDraft
                        cursorPositionEvent={CHANNEL_POST_TEXTBOX_CURSOR_CHANGE}
                        valueEvent={CHANNEL_POST_TEXTBOX_VALUE_CHANGE}
                        ref={this.postDraft}
                        screenId={this.props.componentId}
                        registerTypingAnimation={this.registerTypingAnimation}
                    />
                </KeyboardTrackingView>
                }
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

const getStyle = makeStyleSheetFromTheme((theme) => ({
    backdrop: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
}));