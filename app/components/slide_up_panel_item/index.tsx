// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {type StyleProp, Text, type TextStyle, TouchableHighlight, View, type ViewStyle} from 'react-native';
import FastImage, {type ImageStyle, type Source} from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {isValidUrl} from '@utils/url';

type SlideUpPanelProps = {
    destructive?: boolean;
    leftIcon?: string | Source;
    leftImageStyles?: StyleProp<ImageStyle>;
    leftIconStyles?: StyleProp<TextStyle>;
    rightIcon?: string | Source;
    rightImageStyles?: StyleProp<ImageStyle>;
    rightIconStyles?: StyleProp<TextStyle>;
    onPress: () => void;
    textStyles?: TextStyle;
    testID?: string;
    text: string;
}

export const ITEM_HEIGHT = 48;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: ITEM_HEIGHT,
            marginHorizontal: -20,
            paddingHorizontal: 20,
        },
        destructive: {
            color: theme.dndIndicator,
        },
        row: {
            width: '100%',
            flexDirection: 'row',
        },
        iconContainer: {
            height: ITEM_HEIGHT,
            justifyContent: 'center',
            marginRight: 10,
        },
        noIconContainer: {
            height: ITEM_HEIGHT,
            width: 18,
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        textContainer: {
            justifyContent: 'center',
            flex: 1,
            height: ITEM_HEIGHT,
            marginRight: 5,
        },
        text: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
    };
});

const SlideUpPanelItem = ({
    destructive = false,
    leftIcon,
    leftImageStyles,
    leftIconStyles,
    rightIcon,
    rightImageStyles,
    rightIconStyles,
    onPress,
    testID,
    text,
    textStyles,
}: SlideUpPanelProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const {image: leftImage, iconStyle: leftIconStyle} = useImageAndStyle(leftIcon, leftImageStyles, leftIconStyles, destructive);
    const {image: rightImage, iconStyle: rightIconStyle} = useImageAndStyle(rightIcon, rightImageStyles, rightIconStyles, destructive);

    const handleOnPress = useCallback(preventDoubleTap(onPress, 500), []);

    return (
        <TouchableHighlight
            onPress={handleOnPress}
            style={style.container}
            testID={testID}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
        >
            <View style={style.row}>
                {Boolean(leftImage) &&
                    <View style={leftIconStyle}>{leftImage}</View>
                }
                <View style={style.textContainer}>
                    <Text style={[style.text, destructive && style.destructive, textStyles]}>{text}</Text>
                </View>
                {Boolean(rightImage) &&
                    <View style={rightIconStyle}>{rightImage}</View>
                }
            </View>
        </TouchableHighlight>
    );
};

const useImageAndStyle = (icon: string | Source | undefined, imageStyles: StyleProp<ImageStyle>, iconStyles: StyleProp<TextStyle>, destructive: boolean) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let image;
    let iconStyle: Array<StyleProp<ViewStyle>> = [style.iconContainer];
    if (icon) {
        if (typeof icon === 'object') {
            if (icon.uri && isValidUrl(icon.uri)) {
                const imageStyle: StyleProp<ImageStyle> = [imageStyles];
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
            const compassIconStyle = [style.icon, iconStyles];
            if (destructive) {
                compassIconStyle.push(style.destructive);
            }
            image = (
                <CompassIcon
                    name={icon}
                    size={24}
                    style={compassIconStyle}
                />
            );
        }
    }

    return {image, iconStyle};
};

export default SlideUpPanelItem;
