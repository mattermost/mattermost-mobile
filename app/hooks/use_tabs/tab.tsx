// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

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
            right: -6,
            top: 4,
        },
    };
});

type TabProps<T extends string> = {
    name: MessageDescriptor;
    id: T;
    requiresUserAttention?: boolean;
    handleTabChange: (value: T) => void;
    isSelected: boolean;
    testID: string;
}

const Tab = <T extends string>({
    name,
    id,
    requiresUserAttention,
    handleTabChange,
    isSelected,
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
        >
            <View style={containerStyle}>
                <View>
                    <FormattedText
                        {...name}
                        style={textStyle}
                    />
                    {requiresUserAttention ? (
                        <View
                            style={styles.dot}
                            testID={`${testID}.${id}.dot`}
                        />
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default Tab;
