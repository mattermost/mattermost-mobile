// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View, Pressable} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    isConnected: boolean;
    message: string;
    dismissible?: boolean;
    onDismiss?: () => void;
}

const getStyle = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            height: 40,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
        },
        containerNotConnected: {
            backgroundColor: theme.centerChannelColor,
        },
        containerConnected: {
            backgroundColor: theme.onlineIndicator,
        },
        content: {
            flex: 1,
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        text: {
            ...typography('Body', 100, 'SemiBold'),
            color: theme.centerChannelBg,
            textAlign: 'center' as const,
        },
        icon: {
            marginRight: 8,
        },
        dismissButton: {
            marginLeft: 8,
            padding: 4,
        },
        dismissPressed: {
            opacity: 0.5,
        },
    };
});

const ConnectionBanner: React.FC<Props> = ({isConnected, message, dismissible = false, onDismiss}) => {
    const theme = useTheme();
    const style = getStyle(theme);

    return (
        <View
            style={[
                style.container,
                isConnected ? style.containerConnected : style.containerNotConnected,
            ]}
        >
            <View style={style.content}>
                <CompassIcon
                    color={theme.centerChannelBg}
                    name={isConnected ? 'check' : 'information-outline'}
                    size={16}
                    style={style.icon}
                />
                <Text
                    style={style.text}
                    ellipsizeMode='tail'
                    numberOfLines={1}
                >
                    {message}
                </Text>
            </View>

            {dismissible && onDismiss && (
                <Pressable
                    style={({pressed}) => [
                        style.dismissButton,
                        pressed && style.dismissPressed,
                    ]}
                    onPress={onDismiss}
                >
                    <CompassIcon
                        name={'close'}
                        size={14}
                        color={changeOpacity(theme.centerChannelBg, 0.7)}
                    />
                </Pressable>
            )}
        </View>
    );
};

export default ConnectionBanner;
