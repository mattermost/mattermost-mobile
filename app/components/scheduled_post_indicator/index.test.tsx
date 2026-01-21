// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ScheduledPostIndicator from './index';

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
        expect(screen.getByText(/2 scheduled messages in channel/i)).toBeVisible();
    });

    test('should render thread message when isThread is true', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 2,
            isThread: true,
            channelId: 'channel_id',
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.getByText(/2 scheduled messages in thread/i)).toBeVisible();
    });

    test('should render correct message when there is only one scheduled post', () => {
        const props = {
            ...baseProps,
            scheduledPostCount: 1,
            isThread: true,
            channelId: 'channel_id',
        };

        renderWithIntlAndTheme(<ScheduledPostIndicator {...props}/>);
        expect(screen.getByText(/1 scheduled message in thread/i)).toBeVisible();
    });
});
