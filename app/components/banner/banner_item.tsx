// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

export interface BannerItemConfig {
    id: string;
    title?: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'error';

    /**
     * Whether the banner can be dismissed
     * @default true
     */
    dismissible?: boolean;
    onPress?: () => void;
}

interface BannerItemProps {
    banner: BannerItemConfig;
    onPress?: (banner: BannerItemConfig) => void;
    onDismiss?: (banner: BannerItemConfig) => void;
}

const getStyleSheet = (theme: Theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        borderRadius: 8,
        padding: 8,
        marginHorizontal: 8,
        marginVertical: 4,
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
    iconContainer: {
        marginRight: 8,
        width: 20,
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.centerChannelColor,
        marginBottom: 1,
    },
    message: {
        ...typography('Body', 50),
        color: changeOpacity(theme.centerChannelColor, 0.7),
    },
    dismissButton: {
        marginLeft: 12,
        padding: 4,
    },
    pressed: {
        opacity: 0.7,
    },
    dismissPressed: {
        opacity: 0.5,
    },
    info: {
        borderLeftWidth: 4,
        borderLeftColor: theme.linkColor,
    },
    success: {
        borderLeftWidth: 4,
        borderLeftColor: '#28a745',
    },
    warning: {
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    error: {
        borderLeftWidth: 4,
        borderLeftColor: theme.errorTextColor,
    },
});

const getBannerIconName = (type: string): string => {
    switch (type) {
        case 'success':
            return 'check-circle';
        case 'warning':
            return 'alert';
        case 'error':
            return 'alert-circle';
        default:
            return 'information';
    }
};

const getBannerIconColor = (type: string, theme: Theme): string => {
    switch (type) {
        case 'success':
            return '#28a745';
        case 'warning':
            return '#ffc107';
        case 'error':
            return theme.errorTextColor;
        default:
            return theme.linkColor;
    }
};

const BannerItem: React.FC<BannerItemProps> = ({banner, onPress, onDismiss}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        if (banner.onPress) {
            banner.onPress();
        }
        if (onPress) {
            onPress(banner);
        }
    }, [banner, onPress]);

    const handleDismiss = useCallback(() => {
        if (onDismiss) {
            onDismiss(banner);
        }
    }, [banner, onDismiss]);

    return (
        <Pressable
            testID={`banner-item-${banner.id}`}
            style={({pressed}) => [
                styles.container,
                styles[banner.type || 'info'],
                pressed && (banner.onPress || onPress) && styles.pressed,
            ]}
            onPress={handlePress}
            disabled={!banner.onPress && !onPress}
        >
            <View style={styles.iconContainer}>
                <CompassIcon
                    name={getBannerIconName(banner.type || 'info')}
                    size={16}
                    color={getBannerIconColor(banner.type || 'info', theme)}
                />
            </View>

            <View
                style={styles.content}
                testID={`banner-content-${banner.id}`}
            >
                {banner.title && <Text style={styles.title}>{banner.title}</Text>}
                {banner.message && <Text style={styles.message}>{banner.message}</Text>}
            </View>

            {banner.dismissible !== false && onDismiss && (
                <Pressable
                    testID={`banner-dismiss-${banner.id}`}
                    style={({pressed}) => [
                        styles.dismissButton,
                        pressed && styles.dismissPressed,
                    ]}
                    onPress={handleDismiss}
                >
                    <CompassIcon
                        name={'close'}
                        size={14}
                        color={changeOpacity(theme.centerChannelColor, 0.5)}
                    />
                </Pressable>
            )}
        </Pressable>
    );
};

export default BannerItem;
