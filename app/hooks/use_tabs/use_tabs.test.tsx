// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import useTabs, {type TabDefinition} from './use_tabs';

describe('hooks/useTabs', () => {
    const defaultTabs: Array<TabDefinition<string>> = [
        {id: 'tab1', name: {id: 'tab1.name', defaultMessage: 'Tab 1'}},
        {id: 'tab2', name: {id: 'tab2.name', defaultMessage: 'Tab 2'}},
        {id: 'tab3', name: {id: 'tab3.name', defaultMessage: 'Tab 3'}},
    ];

    function getTabComponent(component: React.JSX.Element, id: string) {
        return component.props.children.find((child: any) => child.key === id);
    }

    it('should initialize with the specified default tab', () => {
        const {result} = renderHook(() => useTabs('tab1', defaultTabs));
        const [selectedTab] = result.current;

        expect(selectedTab).toBe('tab1');
    });

    it('should call change callback when tab changes', () => {
        const mockCallback = jest.fn();
        const {result} = renderHook(() => useTabs('tab1', defaultTabs, mockCallback));
        const [, component] = result.current;

        // Find the Tab component for tab2 and simulate change
        act(() => {
            const tab2Props = defaultTabs.find((tab) => tab.id === 'tab2');
            if (tab2Props) {
                getTabComponent(component, 'tab2').props.handleTabChange('tab2');
            }
        });

        expect(mockCallback).toHaveBeenCalledWith('tab2');
    });

    it('should render tabs with dots when specified', () => {
        const tabsWithDot: Array<TabDefinition<string>> = [
            {id: 'tab1', name: {id: 'tab1.name', defaultMessage: 'Tab 1'}, hasDot: true},
            {id: 'tab2', name: {id: 'tab2.name', defaultMessage: 'Tab 2'}},
        ];

        const {result} = renderHook(() => useTabs('tab1', tabsWithDot));
        const [, component] = result.current;

        const tab1Component = getTabComponent(component, 'tab1');
        expect(tab1Component.props.hasDot).toBe(true);
    });

    it('should use provided testID', () => {
        const testID = 'test_tabs';
        const {result} = renderHook(() => useTabs('tab1', defaultTabs, undefined, testID));
        const [, component] = result.current;

        const firstTab = component.props.children[0];
        expect(firstTab.props.testID).toBe(testID);
    });

    it('should update selected tab when tab changes', () => {
        const {result} = renderHook(() => useTabs('tab1', defaultTabs));

        act(() => {
            const [, component] = result.current;
            getTabComponent(component, 'tab2').props.handleTabChange('tab2');
        });

        const [selectedTab] = result.current;
        expect(selectedTab).toBe('tab2');
    });
});

