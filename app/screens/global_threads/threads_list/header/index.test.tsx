// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {View} from 'react-native';

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

        const {getByTestId} = render(
            <Header {...props}/>,
        );

        // Verify the tab component is rendered
        expect(getByTestId('tabComponent')).toBeTruthy();
    });
});

