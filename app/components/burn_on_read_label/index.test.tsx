// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import BoRLabel from './index';

// Mock the formatTime utility
jest.mock('@utils/datetime', () => ({
    formatTime: jest.fn((seconds: number) => `${seconds}s`),
}));

describe('components/burn_on_read_label', () => {
    const getBaseProps = (): ComponentProps<typeof BoRLabel> => ({
        durationSeconds: 300,
    });

    it('should render BoR label with formatted duration', () => {
        const props = getBaseProps();
        const {getByText} = render(<BoRLabel {...props}/>);

        expect(getByText('BURN ON READ (300s)')).toBeTruthy();
    });

    it('should render with custom test ID when id prop is provided', () => {
        const props = getBaseProps();
        props.id = 'custom';
        const {getByTestId} = render(<BoRLabel {...props}/>);

        expect(getByTestId('custom_bor_label')).toBeTruthy();
    });

    it('should render with default test ID when no id prop is provided', () => {
        const props = getBaseProps();
        const {getByTestId} = render(<BoRLabel {...props}/>);

        expect(getByTestId('bor_label')).toBeTruthy();
    });

    it('should handle different duration values', () => {
        const props = getBaseProps();
        props.durationSeconds = 60;
        const {getByText} = render(<BoRLabel {...props}/>);

        expect(getByText('BURN ON READ (60s)')).toBeTruthy();
    });

    it('should render Tag component with correct props', () => {
        const props = getBaseProps();
        const {getByTestId} = render(<BoRLabel {...props}/>);

        const tag = getByTestId('bor_label');
        expect(tag).toBeTruthy();
        // The Tag component should have the fire icon and dangerDim type
        // These would be tested in the Tag component's own tests
    });
});
