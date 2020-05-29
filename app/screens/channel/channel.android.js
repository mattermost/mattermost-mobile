// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {openMainSideMenu, openSettingsSideMenu} from '@actions/navigation';
import LocalConfig from '@assets/config';
import KeyboardLayout from '@components/layout/keyboard_layout';
import InteractiveDialogController from '@components/interactive_dialog_controller';
import NetworkIndicator from '@components/network_indicator';
import PostDraft from '@components/post_draft';
import {NavigationTypes} from '@constants';
import EventEmitter from '@mm-redux/utils/event_emitter';

import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

import ChannelBase, {ClientUpgradeListener} from './channel_base';

export default class ChannelAndroid extends ChannelBase {
    openMainSidebar = () => {
        EventEmitter.emit(NavigationTypes.BLUR_POST_DRAFT);
        openMainSideMenu();
    };

    openSettingsSidebar = () => {
        EventEmitter.emit(NavigationTypes.BLUR_POST_DRAFT);
        openSettingsSideMenu();
    };

    render() {
        const {theme} = this.props;
        let component = this.renderLoadingOrFailedChannel();

        if (!component) {
            component = (
                <KeyboardLayout>
                    <View style={style.flex}>
                        <ChannelPostList registerTypingAnimation={this.registerTypingAnimation}/>
                    </View>
                    <PostDraft
                        ref={this.postDraft}
                        screenId={this.props.componentId}
                        registerTypingAnimation={this.registerTypingAnimation}
                    />
                </KeyboardLayout>
            );
        }

        const drawerContent = (
            <>
                <ChannelNavBar
                    openMainSidebar={this.openMainSidebar}
                    openSettingsSidebar={this.openSettingsSidebar}
                    onPress={this.goToChannelInfo}
                />
                {component}
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