// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import Tab from './tab';

import type {TabDefinition} from '.';

type Props<T extends string> = {
    tabs: Array<TabDefinition<T>>;
    selectedTab: T;
    onTabChange: (tabId: T) => void;
    testID?: string;
};

const styles = StyleSheet.create({
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

export default function Tabs<T extends string>({
    tabs,
    selectedTab,
    onTabChange,
    testID,
}: Props<T>) {
    const tabsComponents = tabs.map(({name, id, hasDot}) => {
        const isSelected = selectedTab === id;
        return (
            <Tab
                key={id}
                name={name}
                id={id}
                hasDot={hasDot}
                handleTabChange={onTabChange}
                isSelected={isSelected}
                testID={testID || 'tabs'}
            />
        );
    });

    return (
        <View style={styles.menuContainer}>
            {tabsComponents}
        </View>
    );
}
