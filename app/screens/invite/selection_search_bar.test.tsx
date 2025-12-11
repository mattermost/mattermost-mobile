// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {act, fireEvent, renderWithIntl} from '@test/intl-test-helper';

import SelectionSearchBar from './selection_search_bar';

describe('SelectionSearchBar', () => {
    const mockOnSearchChange = jest.fn();
    const mockOnLayoutContainer = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof SelectionSearchBar> {
        return {
            term: '',
            onSearchChange: mockOnSearchChange,
            onLayoutContainer: mockOnLayoutContainer,
        };
    }

    it('renders correctly', () => {
        const props = getBaseProps();

        const {getByTestId, getByText} = renderWithIntl(
            <SelectionSearchBar {...props}/>,
        );

        expect(getByTestId('invite.search_bar')).toBeTruthy();
        expect(getByText('Send invitations to…')).toBeTruthy();
        expect(getByTestId('invite.search_bar_input')).toBeTruthy();
    });

    it('calls onSearchChange when text changes', () => {
        const props = getBaseProps();

        const {getByTestId} = renderWithIntl(
            <SelectionSearchBar {...props}/>,
        );

        const input = getByTestId('invite.search_bar_input');
        act(() => {
            fireEvent.changeText(input, 'test');
        });

        expect(mockOnSearchChange).toHaveBeenCalledWith('test');
    });

    it('displays the term value', () => {
        const props = getBaseProps();
        props.term = 'test@example.com';

        const {getByTestId} = renderWithIntl(
            <SelectionSearchBar {...props}/>,
        );

        const input = getByTestId('invite.search_bar_input');
        expect(input.props.value).toBe('test@example.com');
    });
});
