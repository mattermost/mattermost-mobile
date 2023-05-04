// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, type TextStyle, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    name: string;
    size: number;
    style: StyleProp<TextStyle>;
    unavailable: boolean;
    errorContainerStyle?: StyleProp<ViewStyle>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            position: 'relative',
        },
        unavailable: {
            color: changeOpacity(theme.buttonColor, 0.32),
        },
        errorContainer: {
            position: 'absolute',
            right: 0,
            backgroundColor: theme.centerChannelColor,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 0.5,
            borderColor: theme.centerChannelColor,
        },
        errorIcon: {
            color: theme.dndIndicator,
        },
    };
});

const UnavailableIconWrapper = ({name, size, style: providedStyle, unavailable, errorContainerStyle}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const errorIconSize = size / 2;

    return (
        <View style={style.container}>
            <CompassIcon
                name={name}
                size={size}
                style={[providedStyle, unavailable && style.unavailable]}
            />
            {unavailable &&
                <View
                    style={[
                        style.errorContainer,
                        errorContainerStyle,
                        {borderRadius: errorIconSize / 2},
                    ]}
                >
                    <CompassIcon
                        name={'close-circle'}
                        size={errorIconSize}
                        style={style.errorIcon}
                    />
                </View>
            }
        </View>
    );
};

export default UnavailableIconWrapper;
