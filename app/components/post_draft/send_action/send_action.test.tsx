// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-hooks';
import React from 'react';
import {InteractionManager} from 'react-native';

import {fireEvent, renderWithIntl} from '@test/intl-test-helper';

import SendAction from './index';

describe('components/post_draft/send_action', () => {
    const baseProps = {
        disabled: false,
        sendMessage: jest.fn(),
        testID: 'test_id',
        showScheduledPostOptions: jest.fn(),
        scheduledPostFeatureTooltipWatched: true,
    };

    it('should render send button when enabled', () => {
        const {getByTestId} = renderWithIntl(
            <SendAction {...baseProps}/>,
        );

        const button = getByTestId('test_id.send.button');
        expect(button).toBeTruthy();
    });

    it('should render disabled send button when disabled', () => {
        const {getByTestId} = renderWithIntl(
            <SendAction
                {...baseProps}
                disabled={true}
            />,
        );

        const button = getByTestId('test_id.send.button.disabled');
        expect(button).toBeTruthy();
        expect(button).toBeDisabled();
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

    it('should show the tooltip after when the tutorial has not been watched', async () => {
        const handle = InteractionManager.createInteractionHandle();
        const props = {...baseProps, scheduledPostFeatureTooltipWatched: false};
        const {queryByText} = renderWithIntl(
            <SendAction
                {...props}
            />,
        );
        const text = 'Type a message and long press the send button to schedule it for a later time.';

        expect(queryByText(text)).toBeNull();

        InteractionManager.clearInteractionHandle(handle);
        await new Promise((resolve) => setImmediate(resolve));

        act(() => {
            expect(queryByText(text)).toBeTruthy();
        });
    });
});
