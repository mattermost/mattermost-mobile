// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import Badge from '@components/badge';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {MessageDescriptor} from 'react-intl';

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        menuItemContainer: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            gap: 4,
        },
        menuItemContainerSelected: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        menuItem: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            alignSelf: 'center',
            ...typography('Body', 200, 'SemiBold'),
        },
        menuItemSelected: {
            color: theme.buttonBg,
        },
        dot: {
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.sidebarTextActiveBorder,
            right: 8,
            top: 8,
        },
        badge: {
            position: undefined,
            color: changeOpacity(theme.centerChannelColor, 0.75),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            alignSelf: 'center',
            left: undefined,
            top: undefined,
            borderWidth: 0,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

type TabProps<T extends string> = {
    name: MessageDescriptor;
    id: T;
    requiresUserAttention?: boolean;
    handleTabChange: (value: T) => void;
    isSelected: boolean;
    count?: number;
    testID: string;
}

const Tab = <T extends string>({
    name,
    id,
    requiresUserAttention,
    handleTabChange,
    isSelected,
    count,
    testID,
}: TabProps<T>) => {
    const theme = useTheme();
    const styles = getStyleSheetFromTheme(theme);
    const onPress = useCallback(() => {
        handleTabChange(id);
    }, [handleTabChange, id]);

    const containerStyle = useMemo(() => {
        return isSelected ? [styles.menuItemContainer, styles.menuItemContainerSelected] : styles.menuItemContainer;
    }, [isSelected, styles.menuItemContainer, styles.menuItemContainerSelected]);

    const textStyle = useMemo(() => {
        return isSelected ? [styles.menuItem, styles.menuItemSelected] : styles.menuItem;
    }, [isSelected, styles.menuItem, styles.menuItemSelected]);

    return (
        <TouchableOpacity
            key={id}
            onPress={onPress}
            testID={`${testID}.${id}.button`}
            accessibilityState={{selected: isSelected}}
        >
            <View style={containerStyle}>
                <FormattedText
                    {...name}
                    style={textStyle}
                />
                {count ? (
                    <Badge
                        value={count}
                        visible={count !== 0}
                        testID={`${testID}.${id}.badge`}
                        style={styles.badge}
                    />
                ) : null}
                {requiresUserAttention ? (
                    <View
                        style={styles.dot}
                        testID={`${testID}.${id}.dot`}
                    />
                ) : null}
            </View>
        </TouchableOpacity>
    );
};

export default Tab;
