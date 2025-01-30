// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithIntl} from '@test/intl-test-helper';

import SendAction from './index';
import {act} from '@testing-library/react-hooks';

describe('components/post_draft/send_action', () => {
    const baseProps = {
        disabled: false,
        sendMessage: jest.fn(),
        testID: 'test_id',
        showScheduledPostOptions: jest.fn(),
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
                sendMessage={onPress}
            />,
        );

        const button = getByTestId('test_id.send.button');
        fireEvent.press(button);

        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should prevent double tap within debounce period', async () => {
        const onPress = jest.fn();
        const {getByTestId} = renderWithIntl(
            <SendAction
                {...baseProps}
                sendMessage={onPress}
            />,
        );

        const button = getByTestId('test_id.send.button');

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
                sendMessage={onPress}
            />,
        );

        const button = getByTestId('test_id.send.button');

        // First tap
        act(() => {
            fireEvent.press(button);
        });

        expect(onPress).toHaveBeenCalledTimes(1);

        act(() => {
            jest.advanceTimersByTime(750);
            fireEvent.press(button);
        });

        expect(onPress).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });

    it('should not call onPress when disabled', () => {
        const onPress = jest.fn();
        const {getByTestId} = renderWithIntl(
            <SendAction
                {...baseProps}
                disabled={true}
                sendMessage={onPress}
            />,
        );

        const button = getByTestId('test_id.send.button.disabled');
        fireEvent.press(button);

        expect(onPress).not.toHaveBeenCalled();
    });
});
