// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import ScheduledPostIndicatorWithDatetime from '../scheduled_post_indicator_with_datetime';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type UserModel from '@typings/database/models/servers/user';

describe('components/ScheduledPostIndicatorWithDatetime', () => {
    const baseProps = {
        scheduledPosts: [{
            scheduledAt: new Date('2024-02-24T10:30:00Z').getTime(),
        }] as ScheduledPostModel[],
        currentUser: {
            timezone: {
                automaticTimezone: 'America/New_York',
                manualTimezone: '',
                useAutomaticTimezone: true,
            },
        } as UserModel,
        isMilitaryTime: false,
    };

    test('should render with correct time format', () => {
        const {getByTestId} = renderWithIntl(
            <ScheduledPostIndicatorWithDatetime {...baseProps}/>,
        );

        const timeElement = getByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
        expect(timeElement.props.children).toBe('5:30 AM');
    });

    test('should render with military time', () => {
        const props = {
            ...baseProps,
            isMilitaryTime: true,
        };

        const {getByTestId} = renderWithIntl(
            <ScheduledPostIndicatorWithDatetime {...props}/>,
        );

        const timeElement = getByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
        expect(timeElement.props.children).toBe('5:30');
    });

    test('should render with different timezone', () => {
        const props = {
            ...baseProps,
            currentUser: {
                timezone: {
                    automaticTimezone: '',
                    manualTimezone: 'Asia/Tokyo',
                    useAutomaticTimezone: false,
                },
            } as UserModel,
        };

        const {getByTestId} = renderWithIntl(
            <ScheduledPostIndicatorWithDatetime {...props}/>,
        );

        const timeElement = getByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
        expect(timeElement.props.children).toBe('7:30 PM');
    });
});
