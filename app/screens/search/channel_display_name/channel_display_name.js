// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Text, View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export default class ChannelDisplayName extends PureComponent {
    static propTypes = {
        displayName: PropTypes.string,
        theme: PropTypes.object.isRequired,
        channelTeamName: PropTypes.string,
    };

    render() {
        const {displayName, theme, channelTeamName} = this.props;
        const styles = getStyleFromTheme(theme);

        return (
            <View style={styles.container}>
                <Text
                    style={styles.channelName}
                    numberOfLines={1}
                >{displayName}</Text>
                {Boolean(channelTeamName) &&
                <>
                    <View style={styles.separator}/>
                    <Text
                        style={styles.teamName}
                        numberOfLines={1}
                    >{channelTeamName}</Text>
                </>
                }
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        channelName: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 14,
            fontWeight: '600',
            flexShrink: 1,
        },
        teamName: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 12,
            fontWeight: '400',
            flexShrink: 2,
        },
        separator: {
            borderStyle: 'solid',
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            height: 16,
            marginRight: 8,
            marginLeft: 8,
            alignSelf: 'stretch',
        },
        container: {
            flexDirection: 'row',
            marginTop: 5,
            paddingHorizontal: 16,
            alignItems: 'baseline',
        },
    };
});
