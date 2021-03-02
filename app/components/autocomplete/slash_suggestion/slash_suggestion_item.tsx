// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Theme} from '@mm-redux/types/preferences';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
const slashIcon = require('@assets/images/autocomplete/slash_command.png');

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        icon: {
            fontSize: 24,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            width: 35,
            height: 35,
            marginRight: 12,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
        },
        iconColor: {
            tintColor: theme.centerChannelColor,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: 8,
            paddingHorizontal: 16,
            overflow: 'hidden',
        },
        suggestionContainer: {
            flex: 1,
        },
        suggestionDescription: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        suggestionName: {
            fontSize: 15,
            color: theme.centerChannelColor,
            marginBottom: 4,
        },
    };
});

type Props = {
    complete: string;
    description: string;
    hint: string;
    onPress: (complete: string) => void;
    suggestion: string;
    theme: Theme;
}

const SlashSuggestionItem = (props: Props) => {
    const insets = useSafeAreaInsets();
    const {
        complete,
        description,
        hint,
        onPress,
        suggestion,
        theme,
    } = props;

    const completeSuggestion = () => {
        onPress(complete);
    };

    const style = getStyleFromTheme(theme);

    let suggestionText = suggestion;
    if (suggestionText[0] === '/' && complete.split(' ').length === 1) {
        suggestionText = suggestionText.substring(1);
    }

    return (
        <TouchableWithFeedback
            onPress={completeSuggestion}
            style={{marginLeft: insets.left, marginRight: insets.right}}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            type={'native'}
        >
            <View style={style.container}>
                <View style={style.icon}>
                    <Image
                        style={style.iconColor}
                        width={10}
                        height={16}
                        source={slashIcon}
                    />
                </View>
                <View style={style.suggestionContainer}>
                    <Text style={style.suggestionName}>{`${suggestionText} ${hint}`}</Text>
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={style.suggestionDescription}
                    >
                        {description}
                    </Text>
                </View>
            </View>
        </TouchableWithFeedback>
    );
};

export default SlashSuggestionItem;
