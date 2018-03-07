// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Text,
    TouchableHighlight,
    View,
} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelButton extends PureComponent {
    static propTypes = {
        channel: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        onPress: PropTypes.func.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {onPress, channel, theme} = this.props;
        const channelName = channel ? channel.display_name : '';
        const styles = getStyleSheet(theme);

        return (
            <TouchableHighlight
                onPress={onPress}
                style={styles.buttonContainer}
                underlayColor={changeOpacity(theme.centerChannelColor, 0.2)}
            >
                <View style={styles.buttonWrapper}>
                    <Text style={styles.buttonLabel}>
                        {formatMessage({id: 'mobile.share_extension.channel', defaultMessage: 'Channel'})}
                    </Text>
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={styles.buttonValue}
                    >
                        {channelName}
                    </Text>
                </View>
            </TouchableHighlight>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        buttonContainer: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderTopWidth: 1,
            height: 70,
            paddingHorizontal: 15,
        },
        buttonWrapper: {
            alignItems: 'flex-start',
            flex: 1,
        },
        buttonLabel: {
            fontSize: 16,
            marginTop: 16,
            marginBottom: 3,
        },
        buttonValue: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 14,
        },
    };
});
