// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity
} from 'react-native';

import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

export default class ChannelMentionItem extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        displayName: PropTypes.string,
        name: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    completeMention = (username) => {
        this.props.onPress(username);
    };

    render() {
        const {
            channelId,
            displayName,
            name,
            theme
        } = this.props;

        const style = getStyleFromTheme(theme);

        return (
            <TouchableOpacity
                key={channelId}
                onPress={this.completeMention.bind(this, name)}
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
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        rowDisplayName: {
            fontSize: 13,
            color: theme.centerChannelColor
        },
        rowName: {
            color: theme.centerChannelColor,
            opacity: 0.6
        }
    };
});
