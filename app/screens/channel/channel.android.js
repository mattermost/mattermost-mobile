// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Dimensions, View} from 'react-native';

import ChannelLoader from 'app/components/channel_loader';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import NetworkIndicator from 'app/components/network_indicator';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import PostTextbox from 'app/components/post_textbox';
import LocalConfig from 'assets/config';

import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

import ChannelBase, {ClientUpgradeListener, style} from './channel_base';

export default class ChannelAndroid extends ChannelBase {
    render() {
        const {height} = Dimensions.get('window');

        const channelLoaderStyle = [style.channelLoader, {height}];
        const drawerContent = (
            <SafeAreaView>
                <StatusBar/>
                <NetworkIndicator/>
                <ChannelNavBar
                    openChannelDrawer={this.openChannelSidebar}
                    openSettingsDrawer={this.openSettingsSidebar}
                    onPress={this.goToChannelInfo}
                />
                <KeyboardLayout>
                    <View style={style.flex}>
                        <ChannelPostList/>
                    </View>
                    <PostTextbox
                        ref={this.postTextbox}
                    />
                </KeyboardLayout>
                <ChannelLoader
                    height={height}
                    style={channelLoaderStyle}
                />
                {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener/>}
            </SafeAreaView>
        );

        return this.renderChannel(drawerContent);
    }
}
