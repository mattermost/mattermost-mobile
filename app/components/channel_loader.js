// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    View
} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default function channelLoader(props) {
    const style = getStyleSheet(props.theme);

    return (
        <View style={style.container}>
            <View style={style.section}>
                <View style={style.avatar}/>
                <View style={style.sectionMessage}>
                    <View style={[style.messageText, {marginRight: 50}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 15}]}/>
                </View>
            </View>
            <View style={style.section}>
                <View style={style.avatar}/>
                <View style={style.sectionMessage}>
                    <View style={[style.messageText, {marginRight: 50}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 15}]}/>
                </View>
            </View>
            <View style={style.section}>
                <View style={style.avatar}/>
                <View style={style.sectionMessage}>
                    <View style={[style.messageText, {marginRight: 50}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 15}]}/>
                </View>
            </View>
            <View style={style.section}>
                <View style={style.avatar}/>
                <View style={style.sectionMessage}>
                    <View style={[style.messageText, {marginRight: 50}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 15}]}/>
                </View>
            </View>
            <View style={style.section}>
                <View style={style.avatar}/>
                <View style={style.sectionMessage}>
                    <View style={[style.messageText, {marginRight: 50}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 0}]}/>
                    <View style={[style.messageText, {marginRight: 15}]}/>
                </View>
            </View>
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
            borderRadius: 20,
            height: 40,
            width: 40
        },
        container: {
            backgroundColor: theme.centerChannelBg,
            flex: 1
        },
        messageText: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 12
        },
        section: {
            flexDirection: 'row',
            padding: 15,
            marginVertical: 5,
            flex: 1,
            maxHeight: 125
        },
        sectionMessage: {
            marginLeft: 10,
            flex: 1,
            justifyContent: 'space-between'
        }
    });
});
