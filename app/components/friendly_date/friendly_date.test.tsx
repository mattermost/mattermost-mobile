// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import FriendlyDate from './index';

describe('Friendly Date', () => {
    it('should render correctly', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2020-05-15T00:00:00.000Z'));

        const justNow = new Date();
        justNow.setSeconds(justNow.getSeconds() - 10);
        let value = justNow.getTime();
        const justNowText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(justNowText.getByText('Now')).toBeTruthy();

        const minutesAgo = new Date();
        minutesAgo.setMinutes(minutesAgo.getMinutes() - 1);
        value = minutesAgo.getTime();
        const minutesAgoText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(minutesAgoText.getByText('1 min. ago')).toBeTruthy();

        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - 4);
        value = hoursAgo.getTime();
        const hoursAgoText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(hoursAgoText.getByText('4 hours ago')).toBeTruthy();

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        value = yesterday.getTime();
        const yesterdayText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(yesterdayText.getByText('yesterday')).toBeTruthy();

        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - 10);
        value = daysAgo.getTime();
        const daysAgoText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(daysAgoText.getByText('10 days ago')).toBeTruthy();

        // Difference is less than 30 days
        const daysEdgeCase = new Date(2020, 3, 28);
        const daysEdgeCaseTodayDate = new Date(2020, 4, 28);
        jest.setSystemTime(daysEdgeCaseTodayDate);
        value = daysEdgeCase.getTime();
        const daysEdgeCaseText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(daysEdgeCaseText.getByText('last month')).toBeTruthy();

        const daysAgoMax = new Date(2020, 4, 6);
        const daysAgoMaxTodayDate = new Date(2020, 5, 5);
        jest.setSystemTime(daysAgoMaxTodayDate);
        value = daysAgoMax.getTime();
        const daysAgoMaxText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(daysAgoMaxText.getByText('30 days ago')).toBeTruthy();

        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - 2);
        value = monthsAgo.getTime();
        const monthsAgoText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(monthsAgoText.getByText('2 months ago')).toBeTruthy();

        const yearsAgo = new Date();
        yearsAgo.setFullYear(yearsAgo.getFullYear() - 2);
        value = yearsAgo.getTime();
        const yearsAgoText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(yearsAgoText.getByText('2 years ago')).toBeTruthy();

        jest.useRealTimers();
    });

    it('should render correctly with times in the future', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2020-05-15T00:00:00.000Z'));

        const justNow = new Date();
        justNow.setSeconds(justNow.getSeconds() + 10);
        let value = justNow.getTime();
        const justNowText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(justNowText.getByText('Now')).toBeTruthy();

        const inMinutes = new Date();
        inMinutes.setMinutes(inMinutes.getMinutes() + 2);
        value = inMinutes.getTime();
        const inMinutesText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(inMinutesText.getByText('in 2 min.')).toBeTruthy();

        const inHours = new Date();
        inHours.setHours(inHours.getHours() + 2);
        value = inHours.getTime();
        const inHoursText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(inHoursText.getByText('in 2 hours')).toBeTruthy();

        const inDays = new Date();
        inDays.setDate(inDays.getDate() + 2);
        value = inDays.getTime();
        const inDaysText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(inDaysText.getByText('in 2 days')).toBeTruthy();

        const inDaysEdgeCase = new Date(2020, 5, 28);
        const inDaysEdgeCaseTodayDate = new Date(2020, 4, 28);
        jest.setSystemTime(inDaysEdgeCaseTodayDate);
        value = inDaysEdgeCase.getTime();
        const inDaysEdgeCaseText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(inDaysEdgeCaseText.getByText('next month')).toBeTruthy();

        const inDaysMax = new Date(2020, 5, 4);
        const inDaysMaxTodayDate = new Date(2020, 4, 5);
        jest.setSystemTime(inDaysMaxTodayDate);
        value = inDaysMax.getTime();
        const inDaysMaxText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(inDaysMaxText.getByText('in 30 days')).toBeTruthy();

        const inMonths = new Date();
        inMonths.setMonth(inMonths.getMonth() + 2);
        value = inMonths.getTime();
        const inMonthsText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(inMonthsText.getByText('in 2 months')).toBeTruthy();

        const inYears = new Date();
        inYears.setFullYear(inYears.getFullYear() + 2);
        value = inYears.getTime();
        const inYearsText = renderWithIntl(
            <FriendlyDate value={value}/>,
        );
        expect(inYearsText.getByText('in 2 years')).toBeTruthy();

        jest.useRealTimers();
    });
});
