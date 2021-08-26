// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Keyboard, View, Text, StyleSheet} from 'react-native';
import MathView from 'react-native-math-view';

import {goToScreen} from '@actions/navigation';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {getDisplayNameForLanguage} from '@utils/markdown';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import MarkdownCodeBlock from '../markdown_code_block/markdown_code_block';

const MAX_LINES = 2;

export default class LatexCodeBlock extends MarkdownCodeBlock {
    constructor(props) {
        super(props);

        this.state = {
            webViewHeight: 10,
        };
    }

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
        let lines = content.split('\\\\');

        lines = joinNonLineBreaks(lines);

        const numberOfLines = lines.length;

        if (numberOfLines > MAX_LINES) {
            return {
                content: lines.slice(0, MAX_LINES).join('\\\\'),
                numberOfLines,
            };
        }

        return {
            content,
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

        return (
            <TouchableWithFeedback
                onPress={this.handlePress}
                onLongPress={this.handleLongPress}
                type={'opacity'}
            >
                <View style={style.container}>
                    <View style={style.rightColumn}>
                        <View style={style.code}>
                            <MathView
                                style={{height: 40}}
                                math={content}
                                onError={({error}) => <Text style={[{fontWeight: 'bold'}]}>{error}</Text>}
                                renderError={({error}) => <Text style={[{fontWeight: 'bold'}]}>{error}</Text>}
                            />
                        </View>
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
        lineNumbers: {
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.05),
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRightWidth: StyleSheet.hairlineWidth,
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingVertical: 4,
            width: 21,
        },
        lineNumbersText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 12,
            lineHeight: 18,
        },
        rightColumn: {
            flexDirection: 'column',
            flex: 1,
            paddingHorizontal: 6,
            paddingVertical: 4,
        },
        code: {
            flex: 1,
            flexDirection: 'row',
            overflow: 'scroll', // Doesn't actually cause a scrollbar, but stops text from wrapping
        },
        codeText: {
            color: changeOpacity(theme.centerChannelColor, 0.65),
            fontSize: 12,
            lineHeight: 18,
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
    };
});

/**
 * There is no new line in Latex if the line break occurs inside of curly brackets. This function joins these lines back together.
 */
function joinNonLineBreaks(lines) {
    let outLines = lines.slice();

    let i = 0;
    while (i < outLines.length) {
        if (outLines[i].split('{').length === outLines[i].split('}').length) { //Line has no linebreak in between brackets
            i += 1;
        } else if (i < outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + outLines[i + 1]], outLines.slice(i + 2));
        } else if (i === outLines.length - 2) {
            outLines = outLines.slice(0, i).concat([outLines[i] + outLines[i + 1]]);
        } else {
            return outLines;
        }
    }

    return outLines;
}
