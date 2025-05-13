// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import Tab from './tab';
import Tabs from './tabs';

jest.mock('./tab', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(Tab).mockImplementation((props) => React.createElement('Tab', {...props}));

describe('Tabs', () => {
    const baseProps: ComponentProps<typeof Tabs> = {
        tabs: [
            {
                name: {
                    id: 'test.tab1',
                    defaultMessage: 'Test Tab 1',
                },
                id: 'tab1',
                requiresUserAttention: false,
                count: 2,
            },
            {
                name: {
                    id: 'test.tab2',
                    defaultMessage: 'Test Tab 2',
                },
                id: 'tab2',
                requiresUserAttention: true,
            },
        ],
        selectedTab: 'tab1',
        onTabChange: jest.fn(),
        testID: 'test.tabs',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all tabs correctly', () => {
        const {getAllByTestId} = renderWithIntl(
            <Tabs {...baseProps}/>,
        );

        const tabs = getAllByTestId('test.tabs');
        const tab1 = tabs[0];
        const tab2 = tabs[1];

        expect(tab1.props.name).toEqual(baseProps.tabs[0].name);
        expect(tab1.props.id).toBe('tab1');
        expect(tab1.props.requiresUserAttention).toBe(false);
        expect(tab1.props.isSelected).toBe(true);
        expect(tab1.props.handleTabChange).toBe(baseProps.onTabChange);
        expect(tab1.props.testID).toBe('test.tabs');
        expect(tab1.props.count).toBe(2);

        expect(tab2.props.name).toEqual(baseProps.tabs[1].name);
        expect(tab2.props.id).toBe('tab2');
        expect(tab2.props.requiresUserAttention).toBe(true);
        expect(tab2.props.isSelected).toBe(false);
        expect(tab2.props.handleTabChange).toBe(baseProps.onTabChange);
        expect(tab2.props.testID).toBe('test.tabs');
        expect(tab2.props.count).toBe(undefined);
    });

    it('uses `tabs` as testID when testID prop is not provided', () => {
        const {getAllByTestId} = renderWithIntl(
            <Tabs
                {...baseProps}
                testID={undefined}
            />,
        );

        const tabs = getAllByTestId('tabs');
        expect(tabs.length).toBe(2);
    });
});
