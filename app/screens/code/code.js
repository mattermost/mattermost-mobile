// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    BackHandler,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import SyntaxHighlighter from 'react-native-syntax-highlighter';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {getCodeFont} from 'app/utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles, getHighlightStyleFromTheme} from 'app/utils/theme';

export default class Code extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            popTopScreen: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        theme: PropTypes.object.isRequired,
        content: PropTypes.string.isRequired,
        language: PropTypes.string,
        textStyle: CustomPropTypes.Style,
    };

    componentDidMount() {
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
        }
    }

    componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    handleAndroidBack = () => {
        this.props.actions.popTopScreen();
        return true;
    };

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
                <SyntaxHighlighter
                    language={this.props.language}
                    style={getHighlightStyleFromTheme(this.props.theme)}
                    highlighter={'hljs'}
                    CodeTag={TextInput}
                    codeTagProps={{editable: false, multiline: true, style: {...style.codeText, ...this.props.textStyle}}}
                >
                    {this.props.content}
                </SyntaxHighlighter>
            );
        } else {
            textComponent = (
                <SyntaxHighlighter
                    language={this.props.language}
                    style={getHighlightStyleFromTheme(this.props.theme)}
                    highlighter={'hljs'}
                    fontFamily={style.codeText.fontFamily}
                    fontSize={style.codeText.fontSize}
                >
                    {this.props.content}
                </SyntaxHighlighter>
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
                    contentContainerStyle={style.code}
                    horizontal={true}
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
        },
        codeContainer: {
            flexGrow: 0,
            flexShrink: 1,
            width: '100%',
            backgroundColor: getHighlightStyleFromTheme(theme).hljs.background,
        },
        code: {
            paddingHorizontal: 6,
        },
        codeText: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            fontFamily: getCodeFont(),
            lineHeight: 18,
            ...Platform.select({
                android: {
                    fontSize: 13.25,
                    top: -2,
                },
                ios: {
                    fontSize: 12,
                    top: -10,
                },
            }),
        },
    };
});
