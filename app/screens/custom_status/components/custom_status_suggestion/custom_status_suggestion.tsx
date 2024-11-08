// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';

import ClearButton from '@components/custom_status/clear_button';
import CustomStatusText from '@components/custom_status/custom_status_text';
import Emoji from '@components/emoji';
import {CST} from '@constants/custom_status';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    duration?: CustomStatusDuration;
    emoji?: string;
    expires_at?: string;
    handleClear?: (status: UserCustomStatus) => void;
    handleSuggestionClick: (status: UserCustomStatus) => void;
    isExpirySupported: boolean;
    separator: boolean;
    text?: string;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            minHeight: 50,
            alignItems: 'center',
        },
        iconContainer: {
            marginLeft: 14,
            marginRight: 10,
        },
        wrapper: {
            flex: 1,
        },
        textContainer: {
            paddingTop: 14,
            paddingBottom: 14,
            justifyContent: 'center',
            width: '93%',
            flex: 1,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
            marginRight: 16,
        },
        customStatusDuration: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 15,
        },
        customStatusText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
    };
});

const CustomStatusSuggestion = ({duration, emoji, expires_at, handleClear, handleSuggestionClick, isExpirySupported, separator, text, theme}: Props) => {
    const style = getStyleSheet(theme);
    const intl = useIntl();

    const handleClick = useCallback(preventDoubleTap(() => {
        handleSuggestionClick({emoji, text, duration});
    }), []);

    const handleSuggestionClear = useCallback(() => {
        if (handleClear) {
            handleClear({emoji, text, duration, expires_at});
        }
    }, []);

    const showCustomStatus = Boolean(duration && duration !== 'date_and_time' && isExpirySupported);
    const customStatusSuggestionTestId = `custom_status.custom_status_suggestion.${text}`;

    const clearButton =
        handleClear && expires_at ? (
            <View>
                <ClearButton
                    handlePress={handleSuggestionClear}
                    theme={theme}
                    iconName='close'
                    size={18}
                    testID={`${customStatusSuggestionTestId}.clear.button`}
                />
            </View>
        ) : null;

    return (
        <TouchableOpacity
            onPress={handleClick}
            testID={customStatusSuggestionTestId}
        >
            <View style={style.container}>
                {emoji && (
                    <View
                        style={style.iconContainer}
                        testID={`${customStatusSuggestionTestId}.custom_status_emoji.${emoji}`}
                    >
                        <Emoji
                            emojiName={emoji}
                            size={20}
                        />
                    </View>
                )}
                <View style={style.wrapper}>
                    <View style={style.textContainer}>
                        {Boolean(text) && (
                            <View>
                                <CustomStatusText
                                    text={text}
                                    theme={theme}
                                    textStyle={style.customStatusText}
                                    testID={`${customStatusSuggestionTestId}.custom_status_text`}
                                />
                            </View>
                        )}
                        {showCustomStatus && (
                            <View style={{paddingTop: 5}}>
                                <CustomStatusText
                                    text={intl.formatMessage(CST[duration!])}
                                    theme={theme}
                                    textStyle={style.customStatusDuration}
                                    testID={`${customStatusSuggestionTestId}.custom_status_duration.${duration}`}
                                />
                            </View>
                        )}
                    </View>
                    {separator && <View style={style.divider}/>}
                </View>
                {clearButton}
            </View>
        </TouchableOpacity>
    );
};

export default CustomStatusSuggestion;
