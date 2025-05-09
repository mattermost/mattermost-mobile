// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import Tag from './tag';

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(() => ({
        centerChannelColor: '#3F4350',
    })),
}));

describe('components/alert_banner/tag', () => {
    it('should render correctly with text', () => {
        const {getByText} = render(
            <Tag
                text='Test Tag'
                type='info'
            />,
        );

        expect(getByText('Test Tag')).toBeTruthy();
    });

    it('should have accessibility role', () => {
        const {getByRole} = render(
            <Tag
                text='Test Tag'
                type='info'
            />,
        );

        expect(getByRole('text')).toBeTruthy();
    });
});
