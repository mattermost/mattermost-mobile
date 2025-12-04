// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ShowMoreButton from './show_more_button';

describe('ShowMoreButton', () => {
    function getBaseProps(): ComponentProps<typeof ShowMoreButton> {
        return {
            fetching: false,
            onPress: jest.fn(),
            visible: true,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly when visible', () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        const button = getByText('Show More');
        expect(button).toBeTruthy();
    });

    it('calls onPress when button is pressed', async () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        expect(props.onPress).toHaveBeenCalled();
    });

    it('prevents double tap', async () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntl(<ShowMoreButton {...props}/>);

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        await act(async () => {
            fireEvent.press(getByText('Show More'));
        });

        expect(props.onPress).toHaveBeenCalledTimes(1);
    });

    it('does not render when visible is false', () => {
        const props = getBaseProps();
        props.visible = false;

        const {queryByText} = renderWithIntl(<ShowMoreButton {...props}/>);
        expect(queryByText('Show More')).toBeNull();
    });

    it('shows loader when fetching is true', () => {
        const props = getBaseProps();
        props.fetching = true;

        const {getByTestId} = renderWithIntl(<ShowMoreButton {...props}/>);
        expect(getByTestId('show-more-button-loader')).toBeTruthy();
    });
});
