// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-community/clipboard';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, View, Text, StyleSheet, Platform} from 'react-native';
import MathView from 'react-native-math-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {bottomSheet, dismissBottomSheet, goToScreen} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {getHighlightLanguageName} from '@utils/markdown';
import {splitLatexCodeInLines} from '@utils/markdown/latex';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const MAX_LINES = 2;

type Props = {
    content: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const codeVerticalPadding = Platform.select({
        ios: 4,
        android: 0,
    });

    return {
        bottomSheet: {
            flex: 1,
        },
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
            paddingVertical: codeVerticalPadding,
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
            color: theme.errorTextColor,
        },
    };
});

const LatexCodeBlock = ({content, theme}: Props) => {
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const styles = getStyleSheet(theme);
    const languageDisplayName = getHighlightLanguageName('latex');

    const splitContent = () => {
        const lines = splitLatexCodeInLines(content);
        const numberOfLines = lines.length;

        if (numberOfLines > MAX_LINES) {
            return {
                content: lines.slice(0, MAX_LINES),
                numberOfLines,
            };
        }

        return {
            lines,
            numberOfLines,
        };
    };

    const prevContent = useRef(content);
    const [split, setSplit] = useState(splitContent());

    const handlePress = useCallback(preventDoubleTap(() => {
        const screen = Screens.LATEX;
        const passProps = {
            content,
        };
        const title = intl.formatMessage({
            id: 'mobile.routes.code',
            defaultMessage: '{language} Code',
        }, {
            language: languageDisplayName,
        });

        Keyboard.dismiss();
        requestAnimationFrame(() => {
            goToScreen(screen, title, passProps);
        });
    }), [content, languageDisplayName, intl.locale]);

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            const renderContent = () => {
                return (
                    <View
                        testID='at_mention.bottom_sheet'
                        style={styles.bottomSheet}
                    >
                        <SlideUpPanelItem
                            icon='content-copy'
                            onPress={() => {
                                dismissBottomSheet();
                                Clipboard.setString(content);
                            }}
                            testID='at_mention.bottom_sheet.copy_code'
                            text={intl.formatMessage({id: 'mobile.markdown.code.copy_code', defaultMessage: 'Copy Code'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            icon='cancel'
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
                snapPoints: [bottomSheetSnapPoint(2, ITEM_HEIGHT, insets.bottom), 10],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig, intl, insets, theme]);

    const onRenderErrorMessage = useCallback(({error}: {error: Error}) => {
        return <Text style={styles.errorText}>{'Render error: ' + error.message}</Text>;
    }, []);

    useEffect(() => {
        if (prevContent.current !== content) {
            setSplit(splitContent());
            prevContent.current = content;
        }
    }, [content]);

    let plusMoreLines = null;
    if (split.numberOfLines > MAX_LINES) {
        plusMoreLines = (
            <FormattedText
                style={styles.plusMoreLinesText}
                id='mobile.markdown.code.plusMoreLines'
                defaultMessage='+{count, number} more {count, plural, one {line} other {lines}}'
                values={{
                    count: split.numberOfLines - MAX_LINES,
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
            onPress={handlePress}
            onLongPress={handleLongPress}
            type={'opacity'}
        >
            <View style={styles.container}>
                <View style={styles.rightColumn}>
                    {split.lines?.map((latexCode) => (
                        <View
                            style={styles.code}
                            key={latexCode}
                        >
                            <MathView
                                math={latexCode}
                                renderError={onRenderErrorMessage}
                                resizeMode={'cover'}
                            />
                        </View>
                    ))}
                    {plusMoreLines}
                </View>
                <View style={styles.language}>
                    <Text style={styles.languageText}>
                        {languageDisplayName}
                    </Text>
                </View>
            </View>
        </TouchableWithFeedback>
    );
};

export default LatexCodeBlock;
