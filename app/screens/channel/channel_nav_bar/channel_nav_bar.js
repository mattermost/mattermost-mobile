// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelSearchButton from './channel_search_button';
import ChannelTitle from './channel_title';

export default class ChannelNavBar extends PureComponent {
    static propTypes = {
        isLandscape: PropTypes.bool.isRequired,
        navigator: PropTypes.object.isRequired,
        openChannelDrawer: PropTypes.func.isRequired,
        openSettingsDrawer: PropTypes.func.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.isX = DeviceInfo.getModel() === 'iPhone X';
    }

    render() {
        const {isLandscape, navigator, onPress, theme} = this.props;
        const {openChannelDrawer, openSettingsDrawer} = this.props;
        const style = getStyleFromTheme(theme);
        const padding = {paddingHorizontal: 0};

        let height = 46;
        if (Platform.OS === 'ios') {
            height = 44;
            if (isLandscape) {
                height = 32;
            }

            if (this.isX && isLandscape) {
                padding.paddingHorizontal = 10;
            }
        }

        return (
            <View style={[style.header, padding, {height}]}>
                <ChannelDrawerButton openDrawer={openChannelDrawer}/>
                <ChannelTitle onPress={onPress}/>
                <ChannelSearchButton
                    navigator={navigator}
                    theme={theme}
                />
                <ChannelDrawerButton
                    openDrawer={openSettingsDrawer}
                    type='right'
                />
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            zIndex: 10
        }
    };
});
