// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useMemo, useState, type ComponentProps} from 'react';

import type Tabs from './tabs';
import type {TabDefinition} from './types';

function useTabs<T extends string>(defaultTab: T, tabs: Array<TabDefinition<T>>, changeCallback?: (value: T) => void, testID?: string) {
    const [tab, setTab] = useState(defaultTab);

    const handleTabChange = useCallback((value: T) => {
        setTab(value);
        changeCallback?.(value);
    }, [changeCallback]);

    const tabsProps = useMemo<ComponentProps<typeof Tabs>>(() => ({
        tabs,
        selectedTab: tab,
        onTabChange: handleTabChange,
        testID,
    }), [tabs, tab, handleTabChange, testID]);

    return [tab, tabsProps] as const;
}

export default useTabs;
