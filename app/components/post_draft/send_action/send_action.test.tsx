// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, renderWithIntl} from '@test/intl-test-helper';
import React from 'react';

import SendAction from './index';

describe('components/post_draft/send_action', () => {
    const baseProps = {
        disabled: false,
        onPress: jest.fn(),
        testID: 'test_id',
    };

    it('should match snapshot', () => {
        const {toJSON} = renderWithIntl(
            <SendAction {...baseProps}/>,
        );
        expect(toJSON()).toMatchSnapshot();
    });

    it('should handle single tap', () => {
        const onPress = jest.fn();
        const {getByTestId} = renderWithIntl(
            <SendAction
                {...baseProps}
                onPress={onPress}
            />,
        );

        const button = getByTestId('test_id');
        fireEvent.press(button);

        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should prevent double tap within debounce period', async () => {
        const onPress = jest.fn();
        const {getByTestId} = renderWithIntl(
            <SendAction
                {...baseProps}
                onPress={onPress}
            />,
        );

        const button = getByTestId('test_id');
        
        // First tap
        fireEvent.press(button);
        
        // Second tap immediately after
        fireEvent.press(button);

        // Should only call once despite two taps
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should allow tap after debounce period', async () => {
        jest.useFakeTimers();
        const onPress = jest.fn();
        const {getByTestId} = renderWithIntl(
            <SendAction
                {...baseProps}
                onPress={onPress}
            />,
        );

        const button = getByTestId('test_id');
        
        // First tap
        fireEvent.press(button);
        
        // Advance timers past debounce period
        jest.advanceTimersByTime(400);
        
        // Second tap after debounce
        fireEvent.press(button);

        expect(onPress).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });

    it('should not call onPress when disabled', () => {
        const onPress = jest.fn();
        const {getByTestId} = renderWithIntl(
            <SendAction
                {...baseProps}
                disabled={true}
                onPress={onPress}
            />,
        );

        const button = getByTestId('test_id');
        fireEvent.press(button);

        expect(onPress).not.toHaveBeenCalled();
    });
});
