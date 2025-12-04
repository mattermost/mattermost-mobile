// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import Header from './index';

describe('components/global_threads/threads_list/header', () => {
    const baseProps: ComponentProps<typeof Header> = {
        tabsProps: {
            tabs: [{
                id: 'tab1',
                name: {id: 'tab1.name', defaultMessage: 'Tab 1'},
                requiresUserAttention: true,
            }],
            selectedTab: 'tab1',
            onTabChange: jest.fn(),
            testID: 'testID',
        },
        teamId: 'teamId',
        testID: 'testID',
        hasUnreads: true,
    };

    it('should render tab component', () => {
        const props = {
            ...baseProps,
        };

        const {getByTestId} = renderWithIntl(
            <Header {...props}/>,
        );

        // Verify the tab component is rendered
        expect(getByTestId('testID.tab1.button')).toBeTruthy();
    });
});

