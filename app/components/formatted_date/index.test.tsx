// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import locales from '@i18n/languages';
import React from 'react';
import timezones from 'timezones.json';

import {renderWithIntl} from '@test/intl-test-helper';
import {logDebug} from '@utils/log';
import {getSupportedDeviceTimezone} from '@utils/timezone';

import FormattedDate, {type FormattedDateFormat} from './index';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn(),
    logWarning: jest.fn(),
}));

jest.mock('@utils/timezone', () => ({
    getSupportedDeviceTimezone: jest.fn(),
}));

const DATE = new Date('2024-10-26T10:01:04.653Z');
const FORMATS = [
    undefined,
    {weekday: 'long'},
    {dateStyle: 'medium'},
    {month: 'short', day: 'numeric'},
    {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    },
    {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    },
] satisfies Array<FormattedDateFormat | undefined>;

const TEST_MATRIX = Object.keys(locales).
    map((locale) => FORMATS.map<[string, FormattedDateFormat | undefined]>((format) => [locale, format])).
    flat(1);

function getTimezoneTestsCases() {
    // Mimics the logic for the timezones offered by the web app
    // in webapp/channels/src/components/user_settings/display/manage_timezones/manage_timezones.tsx
    let index = 0;
    const testCases = [];
    let previousTimezone = '';
    for (const timezone of timezones) {
        if (timezone.utc[index] === previousTimezone) {
            index++;
        } else {
            index = 0;
        }
        testCases.push([timezone.utc[index]]);
        previousTimezone = timezone.utc[index];
    }
    return testCases;
}

describe('<FormattedDate/>', () => {
    it.each(TEST_MATRIX)("should match snapshot for '%s' locale and '%p' format", (locale, format) => {
        const wrapper = renderWithIntl(
            <FormattedDate
                format={format}
                value={DATE}
                timezone='UTC'
            />,
            {locale},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render with a manual user time', () => {
        const wrapper = renderWithIntl(
            <FormattedDate
                value={DATE}
                timezone={{
                    automaticTimezone: '',
                    manualTimezone: 'Indian/Mauritius',
                    useAutomaticTimezone: '',
                }}
            />,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should render with an automatic user time', () => {
        const wrapper = renderWithIntl(
            <FormattedDate
                value={DATE}
                timezone={{
                    automaticTimezone: 'Indian/Mauritius',
                    manualTimezone: '',
                    useAutomaticTimezone: 'true',
                }}
            />,
        );

        // Just check that the component render as automatic timezone is environment dependant
        expect(wrapper.toJSON()).toBeTruthy();
    });

    it.each(getTimezoneTestsCases())('should render with timezone %s', (timezone) => {
        const wrapper = renderWithIntl(
            <FormattedDate
                value={DATE}
                timezone={timezone}
                format={{hour: 'numeric', minute: 'numeric'}}
            />,
        );
        expect(wrapper.queryByText('Unknown')).not.toBeTruthy();
        expect(logDebug).not.toHaveBeenCalled();
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should default when timezone is not found', () => {
        const wrapper = renderWithIntl(
            <FormattedDate
                value={DATE}
                timezone={'not valid timezone'}
                format={{hour: 'numeric', minute: 'numeric'}}
            />,
        );
        expect(wrapper.queryByText('Unknown')).not.toBeTruthy();
        expect(logDebug).toHaveBeenCalledTimes(1);
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show unknown on other errors', () => {
        const wrapper = renderWithIntl(
            <FormattedDate
                value={DATE}
                timezone={undefined}
                format={{hour: 'numeric', minute: 'invalid' as any}}
            />,
        );
        expect(wrapper.queryByText('Unknown')).toBeTruthy();
        expect(logDebug).toHaveBeenCalledTimes(2);
    });

    describe('device-timezone fallback', () => {
        // A UTC+5 zone: 00:30 on Oct 26 local time is Oct 25 19:30 UTC.
        // Without the fallback, Hermes formats in UTC and renders the previous day.
        const NEAR_MIDNIGHT_LOCAL = new Date('2024-10-26T00:30:00+05:00'); // 2024-10-25T19:30:00Z

        it('should render in device timezone when no timezone prop is provided', () => {
            jest.mocked(getSupportedDeviceTimezone).mockReturnValue('Asia/Yekaterinburg'); // UTC+5
            const wrapper = renderWithIntl(
                <FormattedDate
                    value={NEAR_MIDNIGHT_LOCAL}
                    format={{dateStyle: 'medium'}}
                />,
            );

            // In Asia/Yekaterinburg the date is Oct 26; in UTC it would be Oct 25.
            expect(wrapper.getByText('Oct 26, 2024')).toBeTruthy();
        });

        it('should not use the device timezone when an explicit timezone prop is provided', () => {
            jest.mocked(getSupportedDeviceTimezone).mockReturnValue('Asia/Yekaterinburg');
            const wrapper = renderWithIntl(
                <FormattedDate
                    value={NEAR_MIDNIGHT_LOCAL}
                    timezone='UTC'
                    format={{dateStyle: 'medium'}}
                />,
            );

            // Explicit UTC prop must win over device fallback.
            expect(wrapper.getByText('Oct 25, 2024')).toBeTruthy();
        });

        it('should fall back gracefully when getSupportedDeviceTimezone returns undefined', () => {
            jest.mocked(getSupportedDeviceTimezone).mockReturnValue(undefined);
            const wrapper = renderWithIntl(
                <FormattedDate
                    value={DATE}
                    format={{dateStyle: 'medium'}}
                />,
            );

            // Should not throw or render 'Unknown' — Intl without a timezone still works.
            expect(wrapper.queryByText('Unknown')).not.toBeTruthy();
        });
    });
});
