// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {ViewTypes} from 'app/constants';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import Icon from 'react-native-vector-icons/Ionicons';

const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
} = ViewTypes;

export default class EmptyToolbar extends PureComponent {
    static propTypes = {
        isLandscape: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.isX = DeviceInfo.getModel() === 'iPhone X';
    }

    render() {
        const {isLandscape, theme} = this.props;

        const style = getStyleFromTheme(theme);
        const padding = {paddingHorizontal: 0};

        let height;
        switch (Platform.OS) {
        case 'android':
            height = ANDROID_TOP_PORTRAIT;
            if (isLandscape) {
                height = ANDROID_TOP_LANDSCAPE;
            }
            break;
        case 'ios':
            height = IOS_TOP_PORTRAIT - STATUS_BAR_HEIGHT;
            if (isLandscape) {
                height = IOS_TOP_LANDSCAPE;
            }

            if (this.isX && isLandscape) {
                padding.paddingHorizontal = 10;
            }
            break;
        }

        return (
            <View style={[style.header, padding, {height}]}>
                <View style={style.button_container}>
                    <View style={style.button_wrapper}>
                        <Icon
                            name='md-menu'
                            size={25}
                            color={theme.sidebarHeaderTextColor}
                        />
                    </View>
                </View>
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
            zIndex: 10,
        },
        button_container: {
            width: 55,
        },
        button_wrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            paddingHorizontal: 10,
        },
    };
});
