// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Emoji from '@components/emoji';
import CustomStatusText from '@components/custom_status/custom_status_text';
import {Theme} from '@mm-redux/types/preferences';
import {CustomStatusDuration, ExpiryMenuItems, UserCustomStatus} from '@mm-redux/types/users';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import React, {useCallback} from 'react';
import {View, TouchableOpacity, Text} from 'react-native';
import ClearButton from '@components/custom_status/clear_button';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    handleSuggestionClick: (status: UserCustomStatus) => void;
    emoji: string;
    text: string;
    handleClear?: (status: UserCustomStatus) => void;
    theme: Theme;
    separator: boolean;
    duration: CustomStatusDuration;
    expires_at?: string;
};

const CustomStatusSuggestion = (props: Props) => {
    const {handleSuggestionClick, emoji, text, theme, separator, handleClear, duration, expires_at} = props;
    const style = getStyleSheet(theme);

    const divider = separator ? <View style={style.divider}/> : null;

    const handleClick = useCallback(preventDoubleTap(() => {
        handleSuggestionClick({emoji, text, duration});
    }), [handleSuggestionClick, emoji, text, duration]);

    const clearButton = handleClear && expires_at ?
        (
            <ClearButton
                handlePress={() => handleClear({emoji, text, duration, expires_at})}
                theme={theme}
                iconName='close-circle'
                size={18}
                testID='custom_status_suggestion.clear.button'
            />
        ) : null;

    return (
        <TouchableOpacity
            testID={`custom_status_suggestion.${text}`}
            onPress={handleClick}
        >
            <View style={style.container}>
                <Text style={style.iconContainer}>
                    <Emoji
                        emojiName={emoji}
                        size={20}
                    />
                </Text>
                <View style={style.wrapper}>
                    <View style={style.textContainer}>
                        <View>
                            <CustomStatusText
                                text={text}
                                theme={theme}
                                textStyle={{color: theme.centerChannelColor}}
                            />
                        </View>
                        <View style={style.expiryTimeContainer}>
                            {duration && (
                                <CustomStatusText
                                    text={ExpiryMenuItems[duration].value}
                                    theme={theme}
                                    textStyle={{color: changeOpacity(theme.centerChannelColor, 0.6)}}
                                />
                            )}
                        </View>
                    </View>
                    {clearButton && (
                        <View style={style.clearButtonContainer}>
                            {clearButton}
                        </View>
                    )}
                    {divider}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default CustomStatusSuggestion;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            display: 'flex',
            flexDirection: 'row',
            padding: 2,
        },
        iconContainer: {
            width: 45,
            height: 46,
            left: 14,
            top: 8,
            marginRight: 6,
            color: theme.centerChannelColor,
        },
        wrapper: {
            flex: 1,
            position: 'relative',
        },
        textContainer: {
            marginBottom: 2,
            alignItems: 'center',
            width: '70%',
            flex: 1,
            flexDirection: 'row',
        },
        expiryTimeContainer: {
            marginLeft: 10,
        },
        clearButtonContainer: {
            position: 'absolute',
            top: 0,
            right: 13,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
            marginRight: 16,
        },
    };
});
