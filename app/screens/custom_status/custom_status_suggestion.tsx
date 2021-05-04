// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, TouchableOpacity, Text} from 'react-native';

import Emoji from '@components/emoji';
import ClearButton from '@components/custom_status/clear_button';
import CustomStatusText from '@components/custom_status/custom_status_text';
import {Theme} from '@mm-redux/types/preferences';
import {UserCustomStatus} from '@mm-redux/types/users';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    handleSuggestionClick: (status: UserCustomStatus) => void;
    emoji: string;
    text: string;
    handleClear?: (status: UserCustomStatus) => void;
    theme: Theme;
    separator: boolean;
};

const CustomStatusSuggestion = (props: Props) => {
    const {handleSuggestionClick, emoji, text, theme, separator, handleClear} = props;
    const style = getStyleSheet(theme);

    const handleClick = useCallback(preventDoubleTap(() => {
        handleSuggestionClick({emoji, text});
    }), [emoji, text]);

    const clearButton = handleClear ?
        (
            <View style={style.clearButtonContainer}>
                <ClearButton
                    handlePress={() => handleClear({emoji, text})}
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
                <Text style={style.iconContainer}>
                    <Emoji
                        emojiName={emoji}
                        size={20}
                    />
                </Text>
                <View style={style.wrapper}>
                    <View style={style.textContainer}>
                        <CustomStatusText
                            text={text}
                            theme={theme}
                            textStyle={{color: theme.centerChannelColor}}
                        />
                    </View>
                    {clearButton}
                    {separator && <View style={style.divider}/>}
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
        clearButtonContainer: {
            position: 'absolute',
            top: 0,
            right: 13,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
    };
});
