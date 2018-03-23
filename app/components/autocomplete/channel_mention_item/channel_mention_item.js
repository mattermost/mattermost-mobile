// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelMentionItem extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        displayName: PropTypes.string,
        name: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    completeMention = () => {
        const {onPress, name} = this.props;
        onPress(name);
    };

    render() {
        const {
            channelId,
            displayName,
            name,
            theme,
        } = this.props;

        const style = getStyleFromTheme(theme);

        return (
            <TouchableOpacity
                key={channelId}
                onPress={this.completeMention}
                style={style.row}
            >
                <Text style={style.rowDisplayName}>{displayName}</Text>
                <Text style={style.rowName}>{` (~${name})`}</Text>
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        rowDisplayName: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        rowName: {
            color: theme.centerChannelColor,
            opacity: 0.6,
        },
    };
});
