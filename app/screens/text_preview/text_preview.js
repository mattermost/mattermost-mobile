// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {getCodeFont} from 'app/utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class TextPreview extends React.PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        content: PropTypes.string.isRequired,
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    countLines = (content) => {
        return content.split('\n').length;
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        const numberOfLines = this.countLines(this.props.content);
        let lineNumbers = '1';
        for (let i = 1; i < numberOfLines; i++) {
            const line = (i + 1).toString();

            lineNumbers += '\n' + line;
        }

        let lineNumbersStyle;
        if (numberOfLines >= 10) {
            lineNumbersStyle = [style.lineNumbers, style.lineNumbersRight];
        } else {
            lineNumbersStyle = style.lineNumbers;
        }

        let textComponent;
        if (Platform.OS === 'ios') {
            textComponent = (
                <TextInput
                    editable={false}
                    multiline={true}
                    value={this.props.content}
                    style={[style.codeText]}
                />
            );
        } else {
            textComponent = (
                <Text
                    selectable={true}
                    style={style.codeText}
                >
                    {this.props.content}
                </Text>
            );
        }

        return (
            <ScrollView
                style={style.scrollContainer}
                contentContainerStyle={style.container}
            >
                <View style={lineNumbersStyle}>
                    <Text style={style.lineNumbersText}>
                        {lineNumbers}
                    </Text>
                </View>
                <ScrollView
                    style={style.codeContainer}
                    horizontal={true}
                    contentContainerStyle={style.code}
                >
                    {textComponent}
                </ScrollView>
            </ScrollView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        scrollContainer: {
            flex: 1,
        },
        container: {
            minHeight: '100%',
            flexDirection: 'row',
        },
        lineNumbers: {
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.05),
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRightWidth: StyleSheet.hairlineWidth,
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingHorizontal: 6,
            paddingVertical: 4,
        },
        lineNumbersRight: {
            alignItems: 'flex-end',
        },
        lineNumbersText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'right',
        },
        codeContainer: {
            flexGrow: 0,
            flexShrink: 1,
            width: '100%',
        },
        code: {
            paddingHorizontal: 6,
            ...Platform.select({
                android: {
                    paddingVertical: 4,
                },
                ios: {
                    top: -4,
                },
            }),
        },
        codeText: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            fontFamily: getCodeFont(),
            fontSize: 12,
            lineHeight: 18,
            ...Platform.select({
                ios: {
                    margin: 0,
                    padding: 0,
                },
            }),
        },
    };
});
