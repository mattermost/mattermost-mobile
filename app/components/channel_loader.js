// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    View
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const GRADIENT_START = 0.05;
const GRADIENT_MIDDLE = 0.1;
const GRADIENT_END = 0.01;

function buildSections(key, style, theme, top) {
    return (
        <View
            key={key}
            style={[style.section, (top && {marginTop: -15})]}
        >
            <View style={style.avatar}/>
            <View style={style.sectionMessage}>
                <LinearGradient
                    start={{x: 0.0, y: 1.0}}
                    end={{x: 1.0, y: 1.0}}
                    colors={[
                        changeOpacity('#e5e5e4', GRADIENT_START),
                        changeOpacity('#d6d6d5', GRADIENT_MIDDLE),
                        changeOpacity('#e5e5e4', GRADIENT_END)
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
                        changeOpacity('#e5e5e4', GRADIENT_END)
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
                        changeOpacity('#e5e5e4', GRADIENT_END)
                    ]}
                    locations={[0.1, 0.3, 0.7]}
                    style={[style.messageText, {alignSelf: 'stretch'}]}
                />
            </View>
        </View>
    );
}

export default function channelLoader(props) {
    const style = getStyleSheet(props.theme);

    return (
        <View style={style.container}>
            {Array(10).fill().map((item, index) => buildSections(index, style, props.theme, index === 0))}
        </View>
    );
}

channelLoader.propTypes = {
    theme: PropTypes.object.isRequired
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        avatar: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderRadius: 16,
            height: 32,
            width: 32
        },
        container: {
            backgroundColor: theme.centerChannelBg,
            flex: 1
        },
        messageText: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 10,
            marginBottom: 10
        },
        section: {
            flexDirection: 'row',
            paddingLeft: 12,
            paddingRight: 20,
            marginVertical: 10
        },
        sectionMessage: {
            marginLeft: 12,
            flex: 1
        }
    });
});
