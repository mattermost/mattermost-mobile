// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Dimensions, View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import Autocomplete, {AUTOCOMPLETE_MAX_HEIGHT} from 'app/components/autocomplete';
import ChannelLoader from 'app/components/channel_loader';
import FileUploadPreview from 'app/components/file_upload_preview';
import NetworkIndicator from 'app/components/network_indicator';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {DeviceTypes} from 'app/constants';

import LocalConfig from 'assets/config';

import ChannelBase, {ClientUpgradeListener, style} from './channel_base';
import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

const ACCESSORIES_CONTAINER_NATIVE_ID = 'channelAccessoriesContainer';
const CHANNEL_POST_TEXTBOX_CURSOR_CHANGE = 'onChannelTextBoxCursorChange';
const CHANNEL_POST_TEXTBOX_VALUE_CHANGE = 'onChannelTextBoxValueChange';

export default class ChannelIOS extends ChannelBase {
    previewChannel = (passProps, options) => {
        const {actions} = this.props;
        const screen = 'ChannelPeek';

        actions.peek(screen, passProps, options);
    };

    optionalProps = {previewChannel: this.previewChannel};

    render() {
        const {height} = Dimensions.get('window');
        const {currentChannelId} = this.props;

        const channelLoaderStyle = [style.channelLoader, {height}];
        if ((DeviceTypes.IS_IPHONE_X || DeviceTypes.IS_TABLET)) {
            channelLoaderStyle.push(style.iOSHomeIndicator);
        }

        const drawerContent = (
            <React.Fragment>
                <SafeAreaView>
                    <StatusBar/>
                    <NetworkIndicator/>
                    <ChannelNavBar
                        openChannelDrawer={this.openChannelSidebar}
                        openSettingsDrawer={this.openSettingsSidebar}
                        onPress={this.goToChannelInfo}
                    />
                    <ChannelPostList
                        updateNativeScrollView={this.updateNativeScrollView}
                    />
                    <View nativeID={ACCESSORIES_CONTAINER_NATIVE_ID}>
                        <FileUploadPreview/>
                        <Autocomplete
                            maxHeight={AUTOCOMPLETE_MAX_HEIGHT}
                            onChangeText={this.handleAutoComplete}
                            cursorPositionEvent={CHANNEL_POST_TEXTBOX_CURSOR_CHANGE}
                            valueEvent={CHANNEL_POST_TEXTBOX_VALUE_CHANGE}
                        />
                    </View>
                    <ChannelLoader
                        height={height}
                        style={channelLoaderStyle}
                    />
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
                    />
                </KeyboardTrackingView>
            </React.Fragment>
        );

        return this.renderChannel(drawerContent, this.optionalProps);
    }
}
