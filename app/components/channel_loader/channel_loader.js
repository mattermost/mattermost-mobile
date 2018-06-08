// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View,
} from 'react-native';
import Placeholder from 'rn-placeholder';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelLoader extends PureComponent {
    static propTypes = {
        backgroundColor: PropTypes.string,
        channelIsLoading: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
    };

    buildSections({key, style, bg, color}) {
        return (
            <View
                key={key}
                style={[style.section, {backgroundColor: bg}]}
            >
                <Placeholder.ImageContent
                    size={32}
                    animate='fade'
                    lineNumber={3}
                    lineSpacing={5}
                    firstLineWidth='80%'
                    hasRadius={true}
                    textSize={14}
                    color={changeOpacity(color, 0.2)}
                />
            </View>
        );
    }

    render() {
        const {channelIsLoading, theme} = this.props;

        if (!channelIsLoading) {
            return null;
        }

        const style = getStyleSheet(theme);
        const bg = this.props.backgroundColor || theme.centerChannelBg;

        return (
            <View style={[style.container, {backgroundColor: bg}]}>
                {Array(6).fill().map((item, index) => this.buildSections({
                    key: index,
                    style,
                    bg,
                    color: theme.centerChannelColor,
                }))}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            ...Platform.select({
                android: {
                    top: 0,
                },
                ios: {
                    top: 15,
                },
            }),
        },
        section: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            flex: 1,
            paddingLeft: 12,
            paddingRight: 20,
            marginVertical: 10,
        },
    };
});
