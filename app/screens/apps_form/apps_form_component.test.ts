// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {AppFieldTypes} from '@constants/apps';

import {initValues} from './apps_form_component';

describe('initValues', () => {
    describe('non-datetime fields', () => {
        it('returns empty object for undefined fields', () => {
            expect(initValues(undefined)).toEqual({});
        });

        it('returns empty object for empty array', () => {
            expect(initValues([])).toEqual({});
        });

        it('skips fields without a name', () => {
            const values = initValues([
                {type: AppFieldTypes.TEXT, value: 'x'} as AppField,
            ]);
            expect(values).toEqual({});
        });

        it('uses the provided value for non-boolean, non-datetime fields', () => {
            const values = initValues([
                {name: 'a', type: AppFieldTypes.TEXT, value: 'hello'} as AppField,
            ]);
            expect(values.a).toBe('hello');
        });

        it('initializes missing values to empty string', () => {
            const values = initValues([
                {name: 'a', type: AppFieldTypes.TEXT} as AppField,
            ]);
            expect(values.a).toBe('');
        });

        it('coerces boolean values correctly', () => {
            const values = initValues([
                {name: 'yes', type: AppFieldTypes.BOOL, value: true} as AppField,
                {name: 'no', type: AppFieldTypes.BOOL, value: false} as AppField,
                {name: 'str', type: AppFieldTypes.BOOL, value: 'true'} as AppField,
                {name: 'empty', type: AppFieldTypes.BOOL} as AppField,
            ]);
            expect(values.yes).toBe(true);
            expect(values.no).toBe(false);
            expect(values.str).toBe(true);
            expect(values.empty).toBe(false);
        });
    });

    describe('datetime field auto-population', () => {
        it('auto-populates a required datetime field with no value', () => {
            const before = moment();
            const values = initValues([
                {
                    name: 'dt',
                    type: AppFieldTypes.DATETIME,
                    is_required: true,
                } as AppField,
            ]);
            const after = moment();

            expect(typeof values.dt).toBe('string');
            const parsed = moment(values.dt as string);
            expect(parsed.isValid()).toBe(true);

            // Default interval is 60 min. Result should be between `before` (rounded up to next hour)
            // and slightly after `after`, and always at minute=0 / second=0.
            expect(parsed.second()).toBe(0);
            expect(parsed.millisecond()).toBe(0);
            expect(parsed.minute()).toBe(0);
            expect(parsed.isSameOrAfter(before)).toBe(true);

            // Upper bound: within one full interval after `after`
            expect(parsed.diff(after, 'minutes')).toBeLessThanOrEqual(60);
        });

        it('rounds up to the configured time_interval (15-minute field)', () => {
            const values = initValues([
                {
                    name: 'dt',
                    type: AppFieldTypes.DATETIME,
                    is_required: true,
                    time_interval: 15,
                } as AppField,
            ]);
            const parsed = moment(values.dt as string);
            expect([0, 15, 30, 45]).toContain(parsed.minute());
            expect(parsed.second()).toBe(0);
        });

        it('prefers datetime_config.time_interval over time_interval', () => {
            const values = initValues([
                {
                    name: 'dt',
                    type: AppFieldTypes.DATETIME,
                    is_required: true,
                    time_interval: 60,
                    datetime_config: {time_interval: 15},
                } as AppField,
            ]);
            const parsed = moment(values.dt as string);
            expect([0, 15, 30, 45]).toContain(parsed.minute());
        });

        it('does NOT auto-populate a non-required datetime field', () => {
            const values = initValues([
                {
                    name: 'dt',
                    type: AppFieldTypes.DATETIME,
                    is_required: false,
                } as AppField,
            ]);
            expect(values.dt).toBe('');
        });

        it('does NOT auto-populate when a value is already provided', () => {
            const values = initValues([
                {
                    name: 'dt',
                    type: AppFieldTypes.DATETIME,
                    is_required: true,
                    value: '2026-01-15T10:00:00Z',
                } as AppField,
            ]);
            expect(values.dt).toBe('2026-01-15T10:00:00Z');
        });

        describe('min_date / max_date clamping', () => {
            it('clamps the default forward when min_date is in the future', () => {
                const future = moment().add(30, 'days').format('YYYY-MM-DD');
                const values = initValues([
                    {
                        name: 'dt',
                        type: AppFieldTypes.DATETIME,
                        is_required: true,
                        min_date: future,
                    } as AppField,
                ]);
                const parsed = moment(values.dt as string);

                // Result should be on or after the min_date
                const minMoment = moment(future, 'YYYY-MM-DD');
                expect(parsed.isSameOrAfter(minMoment)).toBe(true);
            });

            it('clamps the default back when max_date is in the past', () => {
                const past = moment().subtract(30, 'days').format('YYYY-MM-DD');
                const values = initValues([
                    {
                        name: 'dt',
                        type: AppFieldTypes.DATETIME,
                        is_required: true,
                        max_date: past,
                    } as AppField,
                ]);
                const parsed = moment(values.dt as string);

                // Result should be on or before max_date end-of-day
                // Since max_date is a date-only string parsed at 00:00, parsed should match that date
                expect(parsed.format('YYYY-MM-DD')).toBe(past);
            });

            it('resolves relative min_date expressions (e.g. "+7d")', () => {
                const values = initValues([
                    {
                        name: 'dt',
                        type: AppFieldTypes.DATETIME,
                        is_required: true,
                        min_date: '+7d',
                    } as AppField,
                ]);
                const parsed = moment(values.dt as string);
                const expectedMin = moment().add(7, 'days').startOf('day');
                expect(parsed.isSameOrAfter(expectedMin)).toBe(true);
            });

            it('does NOT clamp when default is already within bounds', () => {
                const before = moment();
                const minPast = moment().subtract(30, 'days').format('YYYY-MM-DD');
                const maxFuture = moment().add(30, 'days').format('YYYY-MM-DD');
                const values = initValues([
                    {
                        name: 'dt',
                        type: AppFieldTypes.DATETIME,
                        is_required: true,
                        min_date: minPast,
                        max_date: maxFuture,
                    } as AppField,
                ]);
                const parsed = moment(values.dt as string);
                const after = moment();

                expect(parsed.isSameOrAfter(before)).toBe(true);
                expect(parsed.diff(after, 'minutes')).toBeLessThanOrEqual(60);
            });
        });

        describe('location_timezone', () => {
            it('uses the field timezone when provided', () => {
                const values = initValues([
                    {
                        name: 'dt',
                        type: AppFieldTypes.DATETIME,
                        is_required: true,
                        datetime_config: {location_timezone: 'Asia/Tokyo'},
                    } as AppField,
                ]);
                const parsed = moment(values.dt as string);
                expect(parsed.isValid()).toBe(true);
                expect(parsed.second()).toBe(0);
            });
        });
    });

    describe('date fields (non-datetime) are NOT auto-populated', () => {
        it('leaves required date fields as empty string', () => {
            const values = initValues([
                {
                    name: 'd',
                    type: AppFieldTypes.DATE,
                    is_required: true,
                } as AppField,
            ]);
            expect(values.d).toBe('');
        });
    });
});
