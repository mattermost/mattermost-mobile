// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import BaseChip from './base_chip';
import SelectedChip from './selected_chip';

jest.mock('./base_chip', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(BaseChip).mockImplementation((props) => React.createElement('BaseChip', {...props}));

describe('SelectedChip', () => {
    const mockOnRemove = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render with the correct props', () => {
        const {getByTestId} = render(
            <SelectedChip
                id='test-id'
                text='Test Chip'
                onRemove={mockOnRemove}
                testID='selected-chip'
            />,
        );

        const baseChip = getByTestId('selected-chip');
        expect(baseChip.props.label).toBe('Test Chip');
        expect(baseChip.props.showRemoveOption).toBe(true);
        expect(baseChip.props.showAnimation).toBe(true);
        expect(baseChip.props.prefix).toBeUndefined();
        baseChip.props.onPress();
        expect(mockOnRemove).toHaveBeenCalledTimes(1);
        expect(mockOnRemove).toHaveBeenCalledWith('test-id');
    });
});
