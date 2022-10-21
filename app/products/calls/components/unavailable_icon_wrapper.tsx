// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, TextStyle, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    name: string;
    size: number;
    style: StyleProp<TextStyle>;
    unavailable: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            position: 'relative',
        },
        unavailable: {
            color: changeOpacity(theme.sidebarText, 0.32),
        },
        errorContainer: {
            position: 'absolute',
            right: 0,
            backgroundColor: '#3F4350',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 0.5,
            borderColor: '#3F4350',
        },
        errorIcon: {
            color: theme.dndIndicator,
        },
    };
});

const UnavailableIconWrapper = ({name, size, style: providedStyle, unavailable}: Props) => {
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
                    style={[style.errorContainer, {borderRadius: errorIconSize / 2}]}
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
