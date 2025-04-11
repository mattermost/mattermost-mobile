// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Tab from './tab';

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

export type TabDefinition<T extends string> = {
    name: MessageDescriptor;
    id: T;
    hasDot?: boolean;
}

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
