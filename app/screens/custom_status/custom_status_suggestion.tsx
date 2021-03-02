// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Emoji from '@components/emoji';
import CustomStatusLabel from '@components/sidebars/settings/custom_status_label';
import {Theme} from '@mm-redux/types/preferences';
import {UserCustomStatus} from '@mm-redux/types/users';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import React, {useCallback} from 'react';
import {View} from 'react-native-animatable';
import {TouchableOpacity} from 'react-native-gesture-handler';

type Props = {
    handleSuggestionClick: (status: UserCustomStatus) => void;
    emoji: string;
    text: string;
    handleClear?: (status: UserCustomStatus) => void;
    theme: Theme;
    separator: boolean;
};

const CustomStatusSuggestion = (props: Props) => {
    const {handleSuggestionClick, emoji, text, theme, separator} = props;
    const style = getStyleSheet(theme);

    const divider = separator ? <View style={style.divider}/> : null;

    const handleClick = useCallback(() => {
        handleSuggestionClick({emoji, text});
    }, [handleSuggestionClick, emoji, text]);

    return (
        <TouchableOpacity
            testID={'custom_status.status_suggestion'}
            onPress={handleClick}
        >
            <View style={style.container}>
                <View style={style.iconContainer}>
                    <Emoji
                        emojiName={emoji}
                        size={24}
                    />
                </View>
                <View style={style.wrapper}>
                    <View style={style.textContainer}>
                        <CustomStatusLabel
                            text={text}
                            theme={theme}
                        />
                    </View>
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
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            height: 50,
        },
        iconContainer: {
            width: 45,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 5,
        },
        wrapper: {
            flex: 1,
            position: 'relative',
        },
        textContainer: {
            alignItems: 'center',
            width: '90%',
            flex: 1,
            flexDirection: 'row',
        },
        labelSiblingContainer: {
            position: 'absolute',
            top: 14,
            right: 14,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
    };
});
