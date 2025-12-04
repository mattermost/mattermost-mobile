// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import MathView from '@components/math_view';
import {renderWithIntl} from '@test/intl-test-helper';

import Latex from './index';

import type {AvailableScreens} from '@typings/screens/navigation';

// Mock the MathView component to simulate errors
jest.mock('@components/math_view', () => {
    return {
        __esModule: true,
        default: jest.fn(() => null),
    };
});

describe('Latex', () => {
    const baseProps = {
        componentId: 'test-screen' as AvailableScreens,
        content: '\\frac{1}{2}',
    };

    const renderComponent = (props = {}) => {
        return renderWithIntl(
            <Latex
                {...baseProps}
                {...props}
            />,
        );
    };

    it('should render error message when MathView throws an error', () => {
        jest.mocked(MathView).mockImplementation(() => {
            throw new Error('Test error');
        });
        renderComponent();
        expect(screen.getByText('Latex render error')).toBeTruthy();
    });
});
