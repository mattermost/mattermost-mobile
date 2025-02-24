// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {DRAFT} from '@constants/screens';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {ScheduledPostIndicator} from './scheduled_post_indicator';

jest.mock('@utils/theme', () => ({
    changeOpacity: jest.fn().mockReturnValue('rgba(0,0,0,0.5)'),
    makeStyleSheetFromTheme: jest.fn().mockReturnValue(() => ({
        wrapper: {},
        container: {},
        text: {},
        link: {},
    })),
}));

jest.mock('@actions/local/draft', () => ({
    switchToGlobalDrafts: jest.fn(),
}));

jest.mock('@components/formatted_time', () => {
    const MockFormattedTime = (props: any) => {
        // Store props for test assertions
        MockFormattedTime.mockProps = props;
        return null;
    };
    MockFormattedTime.mockProps = {};
    return MockFormattedTime;
});

describe('ScheduledPostIndicator', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-02-24T12:00:00Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    const baseProps = {
        isMilitaryTime: false,
        scheduledPostCount: 1,
    };

    test('should not render when scheduledPostCount is 0', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 0,
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.queryByText(/scheduled/i)).toBeNull();
    });

    test('should render multiple posts message when scheduledPostCount is greater than 1', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 2,
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.getByText(/2 scheduled messages in channel/i)).toBeTruthy();
    });

    test('should render thread message when isThread is true', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 2,
            isThread: true,
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.getByText(/2 scheduled messages in thread/i)).toBeTruthy();
    });

    test('should handle see all scheduled posts click', () => {
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

        renderWithIntlAndTheme(<ScheduledPostIndicator {...baseProps}/>);

        fireEvent.press(screen.getByText('See all.'));

        expect(emitSpy).toHaveBeenCalledWith(Events.ACTIVE_SCREEN, DRAFT);
        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});
