// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    Text,
    Platform,
    TouchableHighlight,
    TouchableNativeFeedback,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {preventDoubleTap} from '@utils/tap';
import {Theme} from '@mm-redux/types/preferences';
import {isValidUrl} from '@utils/url';
import FastImage, {Source} from 'react-native-fast-image';

type Props = {
    testID?: string,
    destructive?: boolean,
    icon: string | Source,
    onPress: () => void,
    text: string,
    theme: Theme,
}

const PostOption = (props: Props) => {
    const handleOnPress = preventDoubleTap(() => {
        props.onPress();
    }, 500);

    const {destructive, icon, testID, text, theme} = props;
    const style = getStyleSheet(theme);

    // TODO give better typing here
    const Touchable = Platform.select<any>({
        ios: TouchableHighlight,
        android: TouchableNativeFeedback,
    });

    const touchableProps = Platform.select({
        ios: {
            underlayColor: 'rgba(0, 0, 0, 0.1)',
        },
        android: {
            background: TouchableNativeFeedback.Ripple( //eslint-disable-line new-cap
                'rgba(0, 0, 0, 0.1)',
                false,
            ),
        },
    });

    const imageStyle = [style.icon, destructive ? style.destructive : null];
    let image;
    let iconStyle = [style.iconContainer];
    if (typeof icon === 'object') {
        if (icon.uri) {
            imageStyle.push({width: 24, height: 24});
            image = isValidUrl(icon.uri) && (
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
                style={[style.icon, destructive ? style.destructive : null]}
            />
        );
    }

    return (
        <View
            testID={testID}
            style={style.container}
        >
            <Touchable
                onPress={handleOnPress}
                {...touchableProps}
                style={style.row}
            >
                <View style={style.row}>
                    <View style={iconStyle}>
                        {image}
                    </View>
                    <View style={style.textContainer}>
                        <Text style={[style.text, destructive ? style.destructive : null]}>
                            {text}
                        </Text>
                    </View>
                </View>
            </Touchable>
            <View style={style.footer}/>
        </View>
    );
};

export default PostOption;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 51,
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
