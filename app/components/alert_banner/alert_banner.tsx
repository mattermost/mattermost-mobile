// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Tag from './tag';

type GestureResponderEvent = import('react-native').GestureResponderEvent;

type AlertBannerProps = {
    type: 'info' | 'warning' | 'error';
    message: string;
    description?: string;
    tags?: string[];
    isDismissable?: boolean;
    onDismiss?: () => void;
    onPress?: () => void;
    testID?: string;
}

const iconByType = {
    info: 'information-outline',
    warning: 'alert-outline',
    error: 'alert-circle-outline',
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderWidth: 0,
            borderBottomWidth: 1,
            borderTopWidth: 1,
            borderStyle: 'solid',
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            overflow: 'hidden',
        },
        content: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
        },
        body: {
            flex: 1,
            flexDirection: 'column',
            marginLeft: 8,
        },
        message: {
            ...typography('Body', 100, 'SemiBold'),
            color: theme.centerChannelColor,
        },
        description: {
            ...typography('Body', 100, 'Regular'),
            color: theme.centerChannelColor,
            marginTop: 4,
        },
        tagsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 8,
        },
        dismissIcon: {
            marginLeft: 8,
            padding: 4,
        },

        // Info styles
        infoContainer: {
            borderColor: changeOpacity(theme.sidebarTextActiveBorder, 0.16),
            backgroundColor: changeOpacity(theme.sidebarTextActiveBorder, 0.08),
        },
        infoIcon: {
            color: theme.sidebarTextActiveBorder,
        },

        // Warning styles
        warningContainer: {
            borderColor: changeOpacity(theme.awayIndicator, 0.16),
            backgroundColor: changeOpacity(theme.awayIndicator, 0.08),
        },
        warningIcon: {
            color: theme.awayIndicator,
        },

        // Error styles
        errorContainer: {
            borderColor: changeOpacity(theme.dndIndicator, 0.16),
            backgroundColor: changeOpacity(theme.dndIndicator, 0.08),
        },
        errorIcon: {
            color: theme.dndIndicator,
        },
    };
});

const AlertBanner = ({
    type = 'info',
    message,
    description,
    tags,
    isDismissable = false,
    onDismiss,
    onPress,
    testID,
}: AlertBannerProps) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const iconName = iconByType[type];

    const handleDismiss = useCallback((e: GestureResponderEvent) => {
        e.stopPropagation();
        if (onDismiss) {
            onDismiss();
        }
    }, [onDismiss]);

    const containerStyle = useMemo(() => [
        styles.container,
        styles[`${type}Container`],
    ], [styles, type]);

    const iconStyle = useMemo(() => [
        styles[`${type}Icon`],
    ], [styles, type]);

    const ContentWrapper = onPress ? TouchableOpacity : View;
    const contentWrapperProps = onPress ? {onPress} : {};

    return (
        <View
            style={containerStyle}
            testID={testID}
            accessibilityRole='alert'
        >
            <ContentWrapper
                style={styles.content}
                {...contentWrapperProps}
            >
                <CompassIcon
                    name={iconName}
                    size={20}
                    style={iconStyle}
                    testID={testID ? (testID + '-icon') : undefined}
                    accessibilityLabel={`${type} icon`}
                />
                <View style={styles.body}>
                    <Text style={styles.message}>
                        {message}
                    </Text>
                    {description && (
                        <Text style={styles.description}>
                            {description}
                        </Text>
                    )}
                    {tags && tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {tags.map((tag, index) => (
                                <Tag
                                    key={tag + '-' + index}
                                    text={tag}
                                    type={type}
                                />
                            ))}
                        </View>
                    )}
                </View>
                {isDismissable && onDismiss && (
                    <Pressable
                        onPress={handleDismiss}
                        style={styles.dismissIcon}
                        testID={testID ? (testID + '-dismiss') : undefined}
                        accessibilityRole='button'
                        accessibilityLabel='Dismiss'
                    >
                        <CompassIcon
                            name='close'
                            size={16}
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                        />
                    </Pressable>
                )}
            </ContentWrapper>
        </View>
    );
};

export default AlertBanner;
