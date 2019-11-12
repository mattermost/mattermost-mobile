// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';
import {paddingLeft as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelDisplayName extends PureComponent {
    static propTypes = {
        displayName: PropTypes.string,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    render() {
        const {displayName, theme, isLandscape} = this.props;
        const styles = getStyleFromTheme(theme);

        return (
            <Text style={[styles.channelName, padding(isLandscape, +16)]}>{displayName}</Text>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        channelName: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 14,
            fontWeight: '600',
            marginTop: 5,
            paddingHorizontal: 16,
        },
    };
});
