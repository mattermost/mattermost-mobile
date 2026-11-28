// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {AppFieldTypes} from '@constants/apps';

import {displayCellValue} from './apps_form_grid';

describe('displayCellValue', () => {
    const value = '2026-01-16T01:00:00Z';
    const field = {name: 'when', type: AppFieldTypes.DATETIME} as AppField;

    it('formats a datetime in the account timezone when the field has none', () => {
        const timezone = 'America/Los_Angeles';

        expect(displayCellValue(field, value, timezone)).toBe(moment.tz(value, timezone).format('lll'));
        expect(displayCellValue(field, value, timezone)).not.toBe(moment.tz(value, 'UTC').format('lll'));
    });

    it('prefers the field location_timezone over the account timezone', () => {
        const located = {
            ...field,
            datetime_config: {location_timezone: 'Asia/Tokyo'},
        } as AppField;

        expect(displayCellValue(located, value, 'America/Los_Angeles')).toBe(moment.tz(value, 'Asia/Tokyo').format('lll'));
    });
});
