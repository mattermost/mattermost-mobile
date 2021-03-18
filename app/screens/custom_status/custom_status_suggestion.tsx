// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Emoji from '@components/emoji';
import CustomStatusText from '@components/custom_status/custom_status_text';
import {Theme} from '@mm-redux/types/preferences';
import {UserCustomStatus} from '@mm-redux/types/users';
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
};

const CustomStatusSuggestion = (props: Props) => {
    const {handleSuggestionClick, emoji, text, theme, separator, handleClear} = props;
    const style = getStyleSheet(theme);

    const divider = separator ? <View style={style.divider}/> : null;

    const handleClick = useCallback(preventDoubleTap(() => {
        handleSuggestionClick({emoji, text});
    }), [handleSuggestionClick, emoji, text]);

    const clearButton = handleClear ?
        (
            <ClearButton
                handlePress={() => handleClear({emoji, text})}
                theme={theme}
                testID='custom_status_suggestion.clear_button'
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
                        <CustomStatusText
                            text={text}
                            theme={theme}
                            textStyle={{color: theme.centerChannelColor}}
                        />
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
            flexDirection: 'row',
            padding: 2,
        },
        iconContainer: {
            width: 45,
            height: 46,
            textAlignVertical: 'center',
            justifyContent: 'center',
            marginLeft: 5,
            color: theme.centerChannelColor,
        },
        wrapper: {
            flex: 1,
            position: 'relative',
        },
        textContainer: {
            alignItems: 'center',
            width: '70%',
            flex: 1,
            flexDirection: 'row',
        },
        clearButtonContainer: {
            position: 'absolute',
            top: 3,
            right: 14,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
    };
});
