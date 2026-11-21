// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter, View} from 'react-native';

import StatusIndicator from '@components/post_draft/status_indicator';
import {Events} from '@constants';
import {act, cleanup, renderWithIntlAndTheme} from '@test/intl-test-helper';

import Typing from './index';

jest.mock('@components/post_draft/status_indicator', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const channelId = 'channel-id';
const rootId = 'thread-id';
const typingEvent = {
    channelId,
    rootId,
    userId: 'alice-id',
    username: 'Alice',
    now: 100,
};

function emitTyping(event: string, overrides: Partial<typeof typingEvent> = {}) {
    act(() => {
        jest.advanceTimersByTime(1);
        DeviceEventEmitter.emit(event, {...typingEvent, ...overrides});
    });
}

function advanceTime(ms: number) {
    act(() => {
        jest.advanceTimersByTime(ms);
    });
}

describe('components/post_draft/typing', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(1000);
        jest.mocked(StatusIndicator).mockImplementation((props) => (
            <View
                testID='typing_status'
                {...props}
            />
        ));
    });

    afterEach(() => {
        cleanup();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('should preserve a newer typing update when an older update expires', () => {
        const {getByText, getByTestId} = renderWithIntlAndTheme(
            <Typing
                channelId={channelId}
                rootId={rootId}
            />,
        );

        emitTyping(Events.USER_TYPING);
        emitTyping(Events.USER_TYPING, {now: 200});
        emitTyping(Events.USER_STOP_TYPING);
        advanceTime(500);

        expect(getByText('Alice is typing...')).toBeTruthy();
        expect(getByTestId('typing_status')).toHaveProp('visible', true);
    });

    it.each([100, 200])('should hide typing after a stop at %s that expires the current update', (now) => {
        const {getByText, queryByText, getByTestId} = renderWithIntlAndTheme(
            <Typing
                channelId={channelId}
                rootId={rootId}
            />,
        );

        emitTyping(Events.USER_TYPING);
        emitTyping(Events.USER_STOP_TYPING, {now});
        advanceTime(499);
        expect(getByText('Alice is typing...')).toBeTruthy();

        advanceTime(1);
        expect(queryByText('Alice is typing...')).toBeNull();
        expect(getByTestId('typing_status')).toHaveProp('visible', false);
    });

    it('should preserve another user who started typing at the same time', () => {
        const {getByText, queryByText, getByTestId} = renderWithIntlAndTheme(
            <Typing
                channelId={channelId}
                rootId={rootId}
            />,
        );

        emitTyping(Events.USER_TYPING);
        emitTyping(Events.USER_TYPING, {userId: 'bob-id', username: 'Bob'});
        emitTyping(Events.USER_STOP_TYPING);
        advanceTime(500);

        expect(getByText('Bob is typing...')).toBeTruthy();
        expect(queryByText(/Alice/)).toBeNull();
        expect(getByTestId('typing_status')).toHaveProp('visible', true);
    });

    it.each([
        {channelId: 'another-channel'},
        {rootId: 'another-thread'},
    ])('should ignore stop events for another conversation: %j', (overrides) => {
        const {getByText} = renderWithIntlAndTheme(
            <Typing
                channelId={channelId}
                rootId={rootId}
            />,
        );

        emitTyping(Events.USER_TYPING);
        emitTyping(Events.USER_STOP_TYPING, overrides);
        advanceTime(500);

        expect(getByText('Alice is typing...')).toBeTruthy();
    });

    it.each(['', rootId])('should stay visible through repeated typing updates and hide when they expire (rootId: %s)', (conversationRootId) => {
        const {getByTestId} = renderWithIntlAndTheme(
            <Typing
                channelId={channelId}
                rootId={conversationRootId}
            />,
        );

        function receiveTyping() {
            const data = {...typingEvent, rootId: conversationRootId, now: Date.now()};
            act(() => {
                DeviceEventEmitter.emit(Events.USER_TYPING, data);
                setTimeout(() => DeviceEventEmitter.emit(Events.USER_STOP_TYPING, data), 5000);
            });
        }

        receiveTyping();
        advanceTime(2000);
        receiveTyping();
        advanceTime(2000);
        receiveTyping();

        // The first update expires at 5s, while the update from 4s is still current.
        advanceTime(1500);
        expect(getByTestId('typing_status')).toHaveProp('visible', true);

        advanceTime(500);
        receiveTyping();
        advanceTime(1500);
        expect(getByTestId('typing_status')).toHaveProp('visible', true);

        // Flush the remaining stale expiry before the final update expires at 11s.
        advanceTime(1500);
        expect(getByTestId('typing_status')).toHaveProp('visible', true);
        advanceTime(2499);
        expect(getByTestId('typing_status')).toHaveProp('visible', true);
        advanceTime(1);
        expect(getByTestId('typing_status')).toHaveProp('visible', false);
    });
});
