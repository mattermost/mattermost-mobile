// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, Text, type TextStyle, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet, goToScreen} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {getHighlightLanguageFromNameOrAlias, getHighlightLanguageName} from '@utils/markdown';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {SyntaxHiglightProps} from '@typings/components/syntax_highlight';

type MarkdownCodeBlockProps = {
    language: string;
    content: string;
    textStyle: TextStyle;
};

const MAX_LINES = 4;

let syntaxHighlighter: (props: SyntaxHiglightProps) => JSX.Element;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        bottomSheet: {
            flex: 1,
        },
        container: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRadius: 3,
            borderWidth: StyleSheet.hairlineWidth,
            flexDirection: 'row',
        },
        code: {
            flexDirection: 'row',
            overflow: 'scroll', // Doesn't actually cause a scrollbar, but stops text from wrapping
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

const MarkdownCodeBlock = ({language = '', content, textStyle}: MarkdownCodeBlockProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const SyntaxHighlighter = useMemo(() => {
        if (!syntaxHighlighter) {
            syntaxHighlighter = require('@components/syntax_highlight').default;
        }

        return syntaxHighlighter;
    }, []);

    const handlePress = useCallback(preventDoubleTap(() => {
        const screen = Screens.CODE;
        const passProps = {
            code: content,
            language: getHighlightLanguageFromNameOrAlias(language),
            textStyle,
        };

        const languageDisplayName = getHighlightLanguageName(language);
        let title: string;
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
                defaultMessage: 'Code',
            });
        }

        Keyboard.dismiss();
        requestAnimationFrame(() => {
            goToScreen(screen, title, passProps);
        });
    }), [content, intl.locale, language]);

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            const renderContent = () => {
                return (
                    <View
                        testID='at_mention.bottom_sheet'
                        style={style.bottomSheet}
                    >
                        <SlideUpPanelItem
                            leftIcon='content-copy'
                            onPress={() => {
                                dismissBottomSheet();
                                Clipboard.setString(content);
                            }}
                            testID='at_mention.bottom_sheet.copy_code'
                            text={intl.formatMessage({id: 'mobile.markdown.code.copy_code', defaultMessage: 'Copy Code'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            leftIcon='cancel'
                            onPress={() => {
                                dismissBottomSheet();
                            }}
                            testID='at_mention.bottom_sheet.cancel'
                            text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        />
                    </View>
                );
            };

            bottomSheet({
                closeButtonId: 'close-code-block',
                renderContent,
                snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT)],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig?.copyAndPasteProtection, intl, theme, style.bottomSheet, content]);

    const trimContent = (text: string) => {
        const lines = text.split('\n');
        const numberOfLines = lines.length;

        if (numberOfLines > MAX_LINES) {
            return {
                content: lines.slice(0, MAX_LINES).join('\n'),
                numberOfLines,
            };
        }

        return {
            content: text,
            numberOfLines,
        };
    };

    const renderLanguageBlock = () => {
        if (language) {
            const languageDisplayName = getHighlightLanguageName(language);

            if (languageDisplayName) {
                return (
                    <View style={style.language}>
                        <Text style={style.languageText}>
                            {languageDisplayName}
                        </Text>
                    </View>
                );
            }
        }
        return null;
    };

    const {content: codeContent, numberOfLines} = trimContent(content);

    const renderPlusMoreLines = () => {
        if (numberOfLines > MAX_LINES) {
            return (
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
        return null;
    };

    return (
        <>
            <TouchableOpacity
                onPress={handlePress}
                onLongPress={handleLongPress}
                testID='markdown_code_block'
            >
                <View
                    style={style.container}
                    pointerEvents='none'
                >
                    <View>
                        <View style={style.code}>
                            <SyntaxHighlighter
                                code={codeContent}
                                language={getHighlightLanguageFromNameOrAlias(language)}
                                textStyle={textStyle}
                            />
                        </View>
                        {renderPlusMoreLines()}
                    </View>
                    {renderLanguageBlock()}
                </View>
            </TouchableOpacity>
        </>
    );
};

export default MarkdownCodeBlock;

