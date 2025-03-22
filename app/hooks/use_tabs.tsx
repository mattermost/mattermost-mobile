// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {MessageDescriptor} from 'react-intl';

const baseStyle = StyleSheet.create({
    menuContainer: {
        alignItems: 'center',
        flexGrow: 1,
        flexDirection: 'row',
        paddingLeft: 12,
        marginVertical: 12,
        flex: 1,
        overflow: 'hidden',
    },
});

const getTabStyleSheet = makeStyleSheetFromTheme((theme) => {
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

export type TabDefinition<T extends string> = {
    name: MessageDescriptor;
    id: T;
    hasDot?: boolean;
}

type TabProps<T extends string> = {
    name: MessageDescriptor;
    id: T;
    hasDot?: boolean;
    handleTabChange: (value: T) => void;
    isSelected: boolean;
    testID: string;
}

const Tab = <T extends string>({
    name,
    id,
    hasDot,
    handleTabChange,
    isSelected,
    testID,
}: TabProps<T>) => {
    const theme = useTheme();
    const styles = getTabStyleSheet(theme);
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
                    {hasDot ? (
                        <View
                            style={styles.dot}
                            testID={`${testID}.dot`}
                        />
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
};

function useTabs<T extends string>(defaultTab: T, tabs: Array<TabDefinition<T>>, changeCallback?: (value: T) => void, testID?: string) {
    const [tab, setTab] = useState(defaultTab);

    const handleTabChange = useCallback((value: T) => {
        setTab(value);
        changeCallback?.(value);
    }, [changeCallback]);

    const component = useMemo(() => {
        const tabsComponents = tabs.map(({name, id, hasDot}) => {
            const isSelected = tab === id;
            return (
                <Tab
                    key={id}
                    name={name}
                    id={id}
                    hasDot={hasDot}
                    handleTabChange={handleTabChange}
                    isSelected={isSelected}
                    testID={testID || id}
                />
            );
        });
        return (
            <View style={baseStyle.menuContainer}>
                {tabsComponents}
            </View>
        );
    }, [handleTabChange, tab, tabs, testID]);

    return [tab, component] as const;
}

export default useTabs;
