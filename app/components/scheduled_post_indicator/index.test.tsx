// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React, {act} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import {Events} from '@constants';
import {DRAFT} from '@constants/screens';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ScheduledPostIndicator from '.';

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
    switchToGlobalDrafts: jest.fn().mockResolvedValue({error: null}),
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
    const baseProps = {
        isMilitaryTime: false,
        scheduledPostCount: 1,
    };

    test('should render multiple posts message when scheduledPostCount is greater than 1', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 2,
            channelId: 'channel_id',
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.getByText(/2 scheduled messages in channel/i)).toBeTruthy();
    });

    test('should render thread message when isThread is true', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 2,
            isThread: true,
            channelId: 'channel_id',
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.getByText(/2 scheduled messages in thread/i)).toBeTruthy();
    });

    test('should render correct message when there is only one scheduled post', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 1,
            isThread: true,
            channelId: 'channel_id',
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.getByText(/1 scheduled message in thread/i)).toBeTruthy();
    });

    test('should handle see all scheduled posts click', async () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 2,
            channelId: 'channel_id',
        };
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);

        jest.mocked(switchToGlobalDrafts).mockResolvedValue({error: null});
        const button = screen.getByText('See all.');

        await act(async () => {
            fireEvent.press(button);
            await TestHelper.wait(0);
        });

        expect(emitSpy).toHaveBeenCalledWith(Events.ACTIVE_SCREEN, DRAFT);
        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});
