// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {openMainSideMenu, openSettingsSideMenu} from 'app/actions/navigation';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import InteractiveDialogController from 'app/components/interactive_dialog_controller';
import NetworkIndicator from 'app/components/network_indicator';
import PostTextbox from 'app/components/post_textbox';
import {NavigationTypes} from 'app/constants';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

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

        const style = getStyleFromTheme(theme);
        const drawerContent = (
            <>
                <NetworkIndicator/>
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
                    />
                </KeyboardLayout>
                {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener/>}
            </>
        );

        return (
            <>
                <View style={style.backdrop}>
                    {drawerContent}
                </View>
                <InteractiveDialogController
                    theme={theme}
                />
            </>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        backdrop: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        flex: {
            flex: 1,
        },
    };
});