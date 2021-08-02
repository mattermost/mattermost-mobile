// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleProp, Text, View, ViewStyle} from 'react-native';
import FastImage, {ImageStyle, Source} from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {isValidUrl} from '@utils/url';

type SlideUpPanelProps = {
    destructive?: boolean;
    icon?: string | Source;
    onPress: () => void;
    testID?: string;
    text: string;
}

export const ITEM_HEIGHT = 51;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            height: ITEM_HEIGHT,
            width: '100%',
        },
        destructive: {
            color: '#D0021B',
        },
        row: {
            flex: 1,
            flexDirection: 'row',
        },
        iconContainer: {
            alignItems: 'center',
            height: 50,
            justifyContent: 'center',
            width: 60,
        },
        noIconContainer: {
            height: 50,
            width: 18,
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        textContainer: {
            justifyContent: 'center',
            flex: 1,
            height: 50,
            marginRight: 5,
        },
        text: {
            color: theme.centerChannelColor,
            fontSize: 16,
            lineHeight: 19,
            opacity: 0.9,
            letterSpacing: -0.45,
        },
        footer: {
            marginHorizontal: 17,
            borderBottomWidth: 0.5,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});

const SlideUpPanelItem = ({destructive, icon, onPress, testID, text}: SlideUpPanelProps) => {
    const theme = useTheme();
    const handleOnPress = useCallback(preventDoubleTap(onPress, 500), []);
    const style = getStyleSheet(theme);

    let image;
    let iconStyle: StyleProp<ViewStyle> = [style.iconContainer];
    if (icon) {
        const imageStyle: StyleProp<ImageStyle> = [style.icon];
        if (destructive) {
            imageStyle.push(style.destructive);
        }
        if (typeof icon === 'object') {
            if (icon.uri && isValidUrl(icon.uri)) {
                imageStyle.push({width: 24, height: 24});
                image = (
                    <FastImage
                        source={icon}
                        style={imageStyle}
                    />
                );
            } else {
                iconStyle = [style.noIconContainer];
            }
        } else {
            image = (
                <CompassIcon
                    name={icon}
                    size={24}
                    style={imageStyle}
                />
            );
        }
    }

    return (
        <View
            testID={testID}
            style={style.container}
        >
            <TouchableWithFeedback
                onPress={handleOnPress}
                style={style.row}
                type='native'
                underlayColor={changeOpacity(theme.centerChannelColor, 0.5)}
            >
                <View style={style.row}>
                    {Boolean(image) &&
                        <View style={iconStyle}>{image}</View>
                    }
                    <View style={style.textContainer}>
                        <Text style={[style.text, destructive ? style.destructive : null]}>{text}</Text>
                    </View>
                </View>
            </TouchableWithFeedback>
            <View style={style.footer}/>
        </View>
    );
};

export default SlideUpPanelItem;
