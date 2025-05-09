// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {View} from 'react-native';

import {renderWithIntl} from '@test/intl-test-helper';

import Header from './index';

describe('components/global_threads/threads_list/header', () => {
    const baseProps: ComponentProps<typeof Header> = {
        tabsComponent: <View testID='tabComponent'/>,
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
        expect(getByTestId('tabComponent')).toBeTruthy();
    });
});

