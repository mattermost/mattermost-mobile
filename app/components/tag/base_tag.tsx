// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography, type FontSizes} from '@utils/typography';

import type {MessageDescriptor} from 'react-intl';

type TagProps = {
    message: MessageDescriptor | string;
    icon?: string;
    type?: 'general' | 'info' | 'danger' | 'success' | 'warning' | 'infoDim';
    size?: 'xs' | 's' | 'm';
    uppercase?: boolean;
    testID?: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderRadius: 4,
            paddingVertical: 2,
            paddingHorizontal: 4,
            alignItems: 'center',
            justifyContent: 'center',
        },
        generalContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        generalText: {
            color: theme.centerChannelColor,
        },
        infoContainer: {
            backgroundColor: theme.buttonBg,
        },
        infoText: {
            color: theme.buttonColor,
        },
        dangerContainer: {
            backgroundColor: theme.dndIndicator,
        },
        dangerText: {
            color: theme.buttonColor,
        },
        successContainer: {
            backgroundColor: theme.onlineIndicator,
        },
        successText: {
            color: theme.buttonColor,
        },
        warningContainer: {
            backgroundColor: theme.awayIndicator,
        },
        warningText: {
            color: theme.buttonColor,
        },
        infoDimContainer: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.12),
        },
        infoDimText: {
            color: theme.buttonBg,
        },
    };
});

const textTypographyPerSize: Record<Required<TagProps>['size'], FontSizes> = {
    xs: 25,
    s: 75,
    m: 100,
};

const iconSizePerSize: Record<Required<TagProps>['size'], number> = {
    xs: 10,
    s: 12,
    m: 14,
};

const Tag = ({
    message,
    icon,
    type = 'general',
    size = 's',
    uppercase = false,
    testID,
}: TagProps) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const textStyle = useMemo(() => {
        const sizeRelated = typography('Heading', textTypographyPerSize[size]);
        const colorRelated = styles[`${type}Text`];
        const uppercaseRelated = uppercase ? {textTransform: 'uppercase' as const} : {};
        return [sizeRelated, colorRelated, uppercaseRelated];
    }, [size, styles, type, uppercase]);

    const containerStyle = useMemo(() => {
        const colorRelated = styles[`${type}Container`];
        return [styles.container, colorRelated];
    }, [styles, type]);

    let iconComponent;
    if (icon) {
        iconComponent = (
            <CompassIcon
                size={iconSizePerSize[size]}
                name={icon}
                color={styles[`${type}Text`].color}
                testID={testID ? `${testID}.icon` : undefined}
            />
        );
    }
    let textComponent;
    if (typeof message === 'string') {
        textComponent = (
            <Text
                style={textStyle}
                testID={testID}
            >
                {message}
            </Text>
        );
    } else {
        textComponent = (
            <FormattedText
                {...message}
                style={textStyle}
                testID={testID}
            />
        );
    }

    return (
        <View style={containerStyle}>
            {/* We wrap the icon and text in a Text component to avoid
            the ellipsis to go out of the box on iOS */}
            <Text
                numberOfLines={1}
                style={textStyle}
            >
                {iconComponent}
                {' '}
                {textComponent}
            </Text>
        </View>
    );
};

export default Tag;
