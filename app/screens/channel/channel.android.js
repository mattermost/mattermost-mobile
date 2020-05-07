// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import EventEmitter from '@mm-redux/utils/event_emitter';

import {openMainSideMenu, openSettingsSideMenu} from 'app/actions/navigation';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import InteractiveDialogController from 'app/components/interactive_dialog_controller';
import NetworkIndicator from 'app/components/network_indicator';
import PostTextbox from 'app/components/post_textbox';
import {NavigationTypes} from 'app/constants';

import LocalConfig from 'assets/config';

import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

import ChannelBase, {ClientUpgradeListener} from './channel_base';

export default class ChannelAndroid extends ChannelBase {
    openMainSidebar = () => {
        EventEmitter.emit(NavigationTypes.BLUR_POST_TEXTBOX);
        openMainSideMenu();
    };

    openSettingsSidebar = () => {
        EventEmitter.emit(NavigationTypes.BLUR_POST_TEXTBOX);
        openSettingsSideMenu();
    };

    render() {
        const {theme} = this.props;
        const channelLoadingOrFailed = this.renderLoadingOrFailedChannel();
        if (channelLoadingOrFailed) {
            return channelLoadingOrFailed;
        }

        const drawerContent = (
            <>
                <ChannelNavBar
                    openMainSidebar={this.openMainSidebar}
                    openSettingsSidebar={this.openSettingsSidebar}
                    onPress={this.goToChannelInfo}
                />
                <KeyboardLayout>
                    <View style={style.flex}>
                        <ChannelPostList/>
                    </View>
                    <PostTextbox
                        ref={this.postTextbox}
                        screenId={this.props.componentId}
                        key={this.props.currentChannelId}
                    />
                </KeyboardLayout>
                <NetworkIndicator/>
                {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener/>}
            </>
        );

        return (
            <>
                <View style={style.flex}>
                    {drawerContent}
                </View>
                <InteractiveDialogController
                    theme={theme}
                />
            </>
        );
    }
}

const style = StyleSheet.create({
    flex: {
        flex: 1,
    },
});