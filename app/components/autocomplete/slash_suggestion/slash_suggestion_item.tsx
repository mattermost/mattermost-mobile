// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import base64 from 'base-64';
import React, {useCallback, useMemo} from 'react';
import {Image, Text, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SvgXml} from 'react-native-svg';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {COMMAND_SUGGESTION_ERROR} from '@constants/apps';
import {useTheme} from '@context/theme';
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
        uriIcon: {
            width: 16,
            height: 16,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: 8,
            overflow: 'hidden',
        },
        slashIcon: {
            height: 16,
            width: 10,
            tintColor: theme.centerChannelColor,
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
    icon: string;
}

const SlashSuggestionItem = ({
    complete = '',
    description,
    hint,
    onPress,
    suggestion,
    icon,
}: Props) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const iconAsSource = useMemo(() => {
        return {uri: icon};
    }, [icon]);

    const touchableStyle = useMemo(() => {
        return {marginLeft: insets.left, marginRight: insets.right};
    }, [insets]);

    const completeSuggestion = useCallback(() => {
        onPress(complete);
    }, [onPress, complete]);

    let suggestionText = suggestion;
    if (suggestionText?.[0] === '/' && complete.split(' ').length === 1) {
        suggestionText = suggestionText.substring(1);
    }

    if (hint) {
        if (suggestionText?.length) {
            suggestionText += ` ${hint}`;
        } else {
            suggestionText = hint;
        }
    }

    let image = (
        <Image
            style={style.slashIcon}
            source={slashIcon}
        />
    );
    if (icon === COMMAND_SUGGESTION_ERROR) {
        image = (
            <CompassIcon
                name='alert-circle-outline'
                size={24}
            />
        );
    } else if (icon.startsWith('http')) {
        image = (
            <FastImage
                source={iconAsSource}
                style={style.uriIcon}
            />
        );
    } else if (icon.startsWith('data:')) {
        if (icon.startsWith('data:image/svg+xml')) {
            let xml = '';
            try {
                xml = base64.decode(icon.substring('data:image/svg+xml;base64,'.length));
                image = (
                    <SvgXml
                        xml={xml}
                        width={32}
                        height={32}
                    />
                );
            } catch (error) {
                // Do nothing
            }
        } else {
            image = (
                <FastImage
                    source={iconAsSource}
                    style={style.uriIcon}
                />
            );
        }
    }

    const slashSuggestionItemTestId = `autocomplete.slash_suggestion_item.${suggestion}`;

    return (
        <TouchableWithFeedback
            onPress={completeSuggestion}
            style={touchableStyle}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            testID={slashSuggestionItemTestId}
            type={'native'}
        >
            <View style={style.container}>
                <View style={style.icon}>
                    {image}
                </View>
                <View style={style.suggestionContainer}>
                    <Text
                        style={style.suggestionName}
                        testID={`${slashSuggestionItemTestId}.name`}
                    >
                        {`${suggestionText}`}
                    </Text>
                    {Boolean(description) &&
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={style.suggestionDescription}
                            testID={`${slashSuggestionItemTestId}.description`}
                        >
                            {description}
                        </Text>
                    }
                </View>
            </View>
        </TouchableWithFeedback>
    );
};

export default SlashSuggestionItem;
