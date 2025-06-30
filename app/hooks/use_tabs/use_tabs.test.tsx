// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import useTabs from './use_tabs';

import type {TabDefinition} from './types';

describe('hooks/useTabs', () => {
    const defaultTabs: Array<TabDefinition<string>> = [
        {id: 'tab1', name: {id: 'tab1.name', defaultMessage: 'Tab 1'}},
        {id: 'tab2', name: {id: 'tab2.name', defaultMessage: 'Tab 2'}},
        {id: 'tab3', name: {id: 'tab3.name', defaultMessage: 'Tab 3'}},
    ];

    it('should initialize with the specified default tab', () => {
        const {result} = renderHook(() => useTabs('tab1', defaultTabs));
        const [selectedTab] = result.current;

        expect(selectedTab).toBe('tab1');
    });

    it('should call change callback when tab changes', () => {
        const mockCallback = jest.fn();
        const {result} = renderHook(() => useTabs('tab1', defaultTabs, mockCallback));
        const [, tabsProps] = result.current;

        act(() => {
            tabsProps.onTabChange('tab2');
        });

        expect(mockCallback).toHaveBeenCalledWith('tab2');
    });

    it('should render tabs with dots when specified', () => {
        const tabsWithDot: Array<TabDefinition<string>> = [
            {id: 'tab1', name: {id: 'tab1.name', defaultMessage: 'Tab 1'}, requiresUserAttention: true},
            {id: 'tab2', name: {id: 'tab2.name', defaultMessage: 'Tab 2'}},
        ];

        const {result} = renderHook(() => useTabs('tab1', tabsWithDot));
        const [, tabsProps] = result.current;

        expect(tabsProps.tabs[0].requiresUserAttention).toBe(true);
    });

    it('should use provided testID', () => {
        const testID = 'test_tabs';
        const {result} = renderHook(() => useTabs('tab1', defaultTabs, undefined, testID));
        const [, tabsProps] = result.current;

        expect(tabsProps.testID).toBe(testID);
    });

    it('should update selected tab when tab changes', () => {
        const {result} = renderHook(() => useTabs('tab1', defaultTabs));

        act(() => {
            const [, tabsProps] = result.current;
            tabsProps.onTabChange('tab2');
        });

        const [selectedTab] = result.current;
        expect(selectedTab).toBe('tab2');
    });

    it('should use provided count', () => {
        const tabsWithCount: Array<TabDefinition<string>> = [
            {id: 'tab1', name: {id: 'tab1.name', defaultMessage: 'Tab 1'}, count: 1},
            {id: 'tab2', name: {id: 'tab2.name', defaultMessage: 'Tab 2'}, count: 2},
        ];

        const {result} = renderHook(() => useTabs('tab1', tabsWithCount));
        const [, tabsProps] = result.current;

        expect(tabsProps.tabs[0].count).toBe(1);
        expect(tabsProps.tabs[1].count).toBe(2);
    });
});

