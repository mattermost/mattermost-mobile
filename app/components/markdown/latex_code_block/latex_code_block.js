// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Keyboard, View, Text, StyleSheet} from 'react-native';
import MathView from 'react-native-math-view';

import {goToScreen} from '@actions/navigation';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {splitLatexCodeInLines} from '@utils/latex';
import {getDisplayNameForLanguage} from '@utils/markdown';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import MarkdownCodeBlock from '../markdown_code_block/markdown_code_block';

const MAX_LINES = 2;

export default class LatexCodeBlock extends MarkdownCodeBlock {
    static defaultProps = {
        language: 'latex',
    };

    handlePress = preventDoubleTap(() => {
        const {language, content} = this.props;
        const {intl} = this.context;
        const screen = 'Latex';
        const passProps = {
            content,
        };

        const languageDisplayName = getDisplayNameForLanguage(language);
        let title;
        if (languageDisplayName) {
            title = intl.formatMessage(
                {
                    id: 'mobile.routes.code',
                    defaultMessage: '{language} Code',
                },
                {
                    language: languageDisplayName,
                },
            );
        } else {
            title = intl.formatMessage({
                id: 'mobile.routes.code.noLanguage',
                defaultMessage: 'LaTeX Code',
            });
        }

        Keyboard.dismiss();
        requestAnimationFrame(() => {
            goToScreen(screen, title, passProps);
        });
    });

    trimContent = (content) => {
        const lines = splitLatexCodeInLines(content);

        const numberOfLines = lines.length;

        if (numberOfLines > MAX_LINES) {
            return {
                content: lines.slice(0, MAX_LINES),
                numberOfLines,
            };
        }

        return {
            content: lines,
            numberOfLines,
        };
    };

    onWebViewMessage = (data) => {
        this.setState({webViewHeight: data});
    }

    render() {
        const style = getStyleSheet(this.props.theme);

        let language = null;
        if (this.props.language) {
            const languageDisplayName = getDisplayNameForLanguage(this.props.language);

            if (languageDisplayName) {
                language = (
                    <View style={style.language}>
                        <Text style={style.languageText}>
                            {languageDisplayName}
                        </Text>
                    </View>
                );
            }
        }

        const {content, numberOfLines} = this.trimContent(this.props.content);

        let plusMoreLines = null;
        if (numberOfLines > MAX_LINES) {
            plusMoreLines = (
                <FormattedText
                    style={style.plusMoreLinesText}
                    id='mobile.markdown.code.plusMoreLines'
                    defaultMessage='+{count, number} more {count, plural, one {line} other {lines}}'
                    values={{
                        count: numberOfLines - MAX_LINES,
                    }}
                />
            );
        }

        /**
         * Note on the error behavior of math view:
         * - onError returns an Error object
         * - renderError returns an options object with an error attribute that contains the real Error.
         */
        return (
            <TouchableWithFeedback
                onPress={this.handlePress}
                onLongPress={this.handleLongPress}
                type={'opacity'}
            >
                <View style={style.container}>
                    <View style={style.rightColumn}>
                        {content.map((latexCode) => (
                            <View
                                style={style.code}
                                key={latexCode}
                            >
                                <MathView
                                    math={latexCode}
                                    onError={(errorMsg) => {
                                        return <Text style={style.errorText}>{'Error: ' + errorMsg.message}</Text>;
                                    }}
                                    renderError={(errorMsg) => {
                                        return <Text style={style.errorText}>{'Render error: ' + errorMsg.error.message}</Text>;
                                    }}
                                    resizeMode={'cover'}
                                />
                            </View>
                        ))}
                        {plusMoreLines}
                    </View>
                    {language}
                </View>
            </TouchableWithFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRadius: 3,
            borderWidth: StyleSheet.hairlineWidth,
            flexDirection: 'row',
            flex: 1,
        },
        rightColumn: {
            flexDirection: 'column',
            flex: 1,
            paddingLeft: 6,
            paddingVertical: 4,
        },
        code: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            marginLeft: 5,
            paddingVertical: 4
        },
        plusMoreLinesText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 11,
            marginTop: 2,
        },
        language: {
            alignItems: 'center',
            backgroundColor: theme.sidebarHeaderBg,
            justifyContent: 'center',
            opacity: 0.8,
            padding: 6,
            position: 'absolute',
            right: 0,
            top: 0,
        },
        languageText: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 12,
        },
        errorText: {
            fontSize: 14,
            marginHorizontal: 5,
            color: 'rgb(255, 0, 0)',
        },
    };
});
