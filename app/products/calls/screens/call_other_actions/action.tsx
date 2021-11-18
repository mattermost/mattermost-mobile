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
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    destructive: boolean;
    icon: string;
    onPress: () => null;
    text: string;
    theme: Theme;
};

const Action = (props: Props) => {
    const handleOnPress = preventDoubleTap(() => {
        props.onPress();
    }, 500);

    const {destructive, icon, text, theme} = props;
    const style = getStyleSheet(theme);

    const Touchable = Platform.select({
        ios: TouchableHighlight as any,
        android: TouchableNativeFeedback as any,
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

    return (
        <View
            style={style.container}
        >
            <Touchable
                testID='action'
                onPress={handleOnPress}
                {...touchableProps}
                style={style.row}
            >
                <View style={style.row}>
                    <View style={style.iconContainer}>
                        <CompassIcon
                            name={icon}
                            size={24}
                            style={[style.icon, destructive ? style.destructive : null]}
                        />
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

export default Action;
