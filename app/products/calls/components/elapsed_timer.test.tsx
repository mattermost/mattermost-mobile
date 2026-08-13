// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {renderWithIntl} from '@test/intl-test-helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import {ElapsedTimer} from './elapsed_timer';

describe('ElapsedTimer', () => {
    const now = new Date('2026-01-01T12:00:00Z').getTime();
    const secondsAgo = (seconds: number) => now - (seconds * 1000);
    const threeHoursFourMinutesFiveSeconds = (3 * 3600) + (4 * 60) + 5;

    const renderTimer = (props: Partial<ComponentProps<typeof ElapsedTimer>>) => {
        const {rerender, ...rest} = renderWithIntl(
            <ElapsedTimer
                value={now}
                style={{}}
                {...props}
            />,
        );

        return {
            ...rest,
            rerenderTimer: (nextProps: Partial<ComponentProps<typeof ElapsedTimer>>) => act(() => {
                rerender(
                    <ElapsedTimer
                        value={now}
                        style={{}}
                        {...nextProps}
                    />,
                );
            }),
        };
    };

    beforeEach(() => {
        enableFakeTimers();
        jest.setSystemTime(now);
    });

    afterEach(() => {
        disableFakeTimers();
    });

    it('should format as mm:ss under an hour', () => {
        const {getByText} = renderTimer({value: secondsAgo(65)});

        expect(getByText('01:05')).toBeVisible();
    });

    it('should format as h:mm:ss over an hour', () => {
        const {getByText} = renderTimer({value: secondsAgo(threeHoursFourMinutesFiveSeconds)});

        expect(getByText('3:04:05')).toBeVisible();
    });

    it('should drop the seconds over an hour when truncating', () => {
        const {getByText} = renderTimer({value: secondsAgo(threeHoursFourMinutesFiveSeconds), truncateWhenLong: true});

        expect(getByText('3:04')).toBeVisible();
    });

    it('should show no elapsed time for a start time in the future', () => {
        // Happens when the server's clock is ahead of ours.
        const {getByText} = renderTimer({value: secondsAgo(-30)});

        expect(getByText('00:00')).toBeVisible();
    });

    it('should keep counting up on the given interval', async () => {
        const {getByText} = renderTimer({value: secondsAgo(59), updateIntervalInSeconds: 1});
        expect(getByText('00:59')).toBeVisible();

        // Advancing the fake timers moves the clock too, so a second really has passed.
        await act(async () => {
            await advanceTimers(1000);
        });

        expect(getByText('01:00')).toBeVisible();
    });

    it('should count from the new start time when the value changes', async () => {
        const {getByText, rerenderTimer} = renderTimer({value: secondsAgo(65), updateIntervalInSeconds: 1});
        expect(getByText('01:05')).toBeVisible();

        // A DM call being answered moves its start time forward, and the timer has to restart from there
        // rather than stay on the value it was mounted with.
        rerenderTimer({value: now, updateIntervalInSeconds: 1});

        expect(getByText('00:00')).toBeVisible();

        // The interval has to be counting from the new value too: one that still closed over the old value
        // would reset above and then jump back to 01:06 here.
        await act(async () => {
            await advanceTimers(1000);
        });

        expect(getByText('00:01')).toBeVisible();
    });
});
