// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const GRADIENT_START = 0.05;
const GRADIENT_MIDDLE = 0.1;
const GRADIENT_END = 0.01;

export default class ChannelLoader extends PureComponent {
    static propTypes = {
        channelIsLoading: PropTypes.bool.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
    };

    buildSections(key, style, top) {
        return (
            <View
                key={key}
                style={[style.section, (top && {marginTop: Platform.OS === 'android' ? 0 : -15, paddingTop: 10})]}
            >
                <View style={style.avatar}/>
                <View style={style.sectionMessage}>
                    <LinearGradient
                        start={{x: 0.0, y: 1.0}}
                        end={{x: 1.0, y: 1.0}}
                        colors={[
                            changeOpacity('#e5e5e4', GRADIENT_START),
                            changeOpacity('#d6d6d5', GRADIENT_MIDDLE),
                            changeOpacity('#e5e5e4', GRADIENT_END),
                        ]}
                        locations={[0.1, 0.3, 0.7]}
                        style={[style.messageText, {width: 106}]}
                    />
                    <LinearGradient
                        start={{x: 0.0, y: 1.0}}
                        end={{x: 1.0, y: 1.0}}
                        colors={[
                            changeOpacity('#e5e5e4', GRADIENT_START),
                            changeOpacity('#d6d6d5', GRADIENT_MIDDLE),
                            changeOpacity('#e5e5e4', GRADIENT_END),
                        ]}
                        locations={[0.1, 0.3, 0.7]}
                        style={[style.messageText, {alignSelf: 'stretch'}]}
                    />
                    <LinearGradient
                        start={{x: 0.0, y: 1.0}}
                        end={{x: 1.0, y: 1.0}}
                        colors={[
                            changeOpacity('#e5e5e4', GRADIENT_START),
                            changeOpacity('#d6d6d5', GRADIENT_MIDDLE),
                            changeOpacity('#e5e5e4', GRADIENT_END),
                        ]}
                        locations={[0.1, 0.3, 0.7]}
                        style={[style.messageText, {alignSelf: 'stretch'}]}
                    />
                </View>
            </View>
        );
    }

    render() {
        const {channelIsLoading, deviceWidth, theme} = this.props;

        if (!channelIsLoading) {
            return null;
        }

        const style = getStyleSheet(theme);

        return (
            <View style={[style.container, {width: deviceWidth}]}>
                {Array(20).fill().map((item, index) => this.buildSections(index, style, index === 0))}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            position: 'absolute',
            ...Platform.select({
                android: {
                    top: 0,
                },
                ios: {
                    top: 15,
                },
            }),
        },
        avatar: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderRadius: 16,
            height: 32,
            width: 32,
        },
        messageText: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 10,
            marginBottom: 10,
        },
        section: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            paddingLeft: 12,
            paddingRight: 20,
            marginVertical: 10,
        },
        sectionMessage: {
            marginLeft: 12,
            flex: 1,
        },
    };
});

