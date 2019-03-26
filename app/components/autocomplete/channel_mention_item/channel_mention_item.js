// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
} from 'react-native';

import {General} from 'mattermost-redux/constants';
import BotTag from 'app/components/bot_tag';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelMentionItem extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        displayName: PropTypes.string,
        name: PropTypes.string,
        type: PropTypes.string,
        isBot: PropTypes.bool.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    completeMention = () => {
        const {onPress, displayName, name, type} = this.props;
        if (type === General.DM_CHANNEL || type === General.GM_CHANNEL) {
            onPress('@' + displayName.replace(/ /g, ''));
        } else {
            onPress(name);
        }
    };

    render() {
        const {
            channelId,
            displayName,
            name,
            theme,
            type,
            isBot,
        } = this.props;

        const style = getStyleFromTheme(theme);

        if (type === General.DM_CHANNEL || type === General.GM_CHANNEL) {
            if (!displayName) {
                return null;
            }
            return (
                <TouchableOpacity
                    key={channelId}
                    onPress={this.completeMention}
                    style={style.row}
                >
                    <Text style={style.rowDisplayName}>{'@' + displayName}</Text>
                    <BotTag
                        show={isBot}
                        theme={theme}
                    />
                </TouchableOpacity>
            );
        }
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
