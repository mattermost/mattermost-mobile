// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    StatusBar as NativeStatusBar,
} from 'react-native';
import tinyColor from 'tinycolor2';

export default class StatusBar extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        headerColor: PropTypes.string,
    };

    render() {
        const {theme} = this.props;
        let headerColor = tinyColor(theme.sidebarHeaderBg);
        if (this.props.headerColor) {
            headerColor = tinyColor(this.props.headerColor);
        }
        let barStyle = 'light-content';
        if (headerColor.isLight() && Platform.OS === 'ios') {
            barStyle = 'dark-content';
        }

        return <NativeStatusBar barStyle={barStyle}/>;
    }
}
