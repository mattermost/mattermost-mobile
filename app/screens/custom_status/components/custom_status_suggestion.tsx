// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import ClearButton from '@components/custom_status/clear_button';
import CustomStatusText from '@components/custom_status/custom_status_text';
import Emoji from '@components/emoji';
import {CST, CustomStatusDuration} from '@constants/custom_status';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    duration: CustomStatusDuration;
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
        },
        iconContainer: {
            width: 45,
            height: 46,
            left: 14,
            top: 12,
            marginRight: 6,
            color: theme.centerChannelColor,
        },
        wrapper: {
            flex: 1,
        },
        textContainer: {
            paddingTop: 14,
            paddingBottom: 14,
            justifyContent: 'center',
            width: '70%',
            flex: 1,
        },
        clearButtonContainer: {
            position: 'absolute',
            top: 4,
            right: 13,
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

    const showCustomStatus = Boolean(duration && duration !== CustomStatusDuration.DATE_AND_TIME && isExpirySupported);

    const clearButton =
        handleClear && expires_at ? (
            <View style={style.clearButtonContainer}>
                <ClearButton
                    handlePress={handleSuggestionClear}
                    theme={theme}
                    iconName='close'
                    size={18}
                    testID='custom_status_suggestion.clear.button'
                />
            </View>
        ) : null;

    return (
        <TouchableOpacity
            testID={`custom_status_suggestion.${text}`}
            onPress={handleClick}
        >
            <View style={style.container}>
                {emoji && (
                    <Text style={style.iconContainer}>
                        <Emoji
                            emojiName={emoji}
                            size={20}
                        />
                    </Text>
                )}
                <View style={style.wrapper}>
                    <View style={style.textContainer}>
                        {Boolean(text) && (
                            <View>
                                <CustomStatusText
                                    text={text}
                                    theme={theme}
                                    textStyle={style.customStatusText}
                                />
                            </View>
                        )}
                        {showCustomStatus && (
                            <View style={{paddingTop: 5}}>
                                <CustomStatusText
                                    text={intl.formatMessage(CST[duration])}
                                    theme={theme}
                                    textStyle={style.customStatusDuration}
                                />
                            </View>
                        )}
                    </View>
                    {clearButton}
                    {separator && <View style={style.divider}/>}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default CustomStatusSuggestion;
