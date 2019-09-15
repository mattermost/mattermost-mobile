// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedDate from 'app/components/formatted_date';
import FormattedText from 'app/components/formatted_text';

import {shallowWithIntl} from 'test/intl-test-helper.js';

import RecentDate, {
    isToday,
    isYesterday,
} from './recent_date';

describe('RecentDate', () => {
    test('should render "Today" today', () => {
        const today = new Date();

        const props = {
            value: today,
        };

        const wrapper = shallowWithIntl(<RecentDate {...props}/>);

        expect(wrapper.find(FormattedText).exists()).toBe(true);
        expect(wrapper.find(FormattedText).prop('id')).toBe('date_separator.today');
    });

    test('should render "Yesterday" yesterday', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const props = {
            value: yesterday,
        };

        const wrapper = shallowWithIntl(<RecentDate {...props}/>);

        expect(wrapper.find(FormattedText).exists()).toBe(true);
        expect(wrapper.find(FormattedText).prop('id')).toBe('date_separator.yesterday');
    });

    test('should render date two days ago', () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const props = {
            value: twoDaysAgo,
        };

        const wrapper = shallowWithIntl(<RecentDate {...props}/>);

        expect(wrapper.find(FormattedDate).exists()).toBe(true);
    });
});

describe('isToday and isYesterday', () => {
    test('tomorrow at 12am', () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(0);
        date.setMinutes(0);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(false);
    });

    test('now', () => {
        const date = new Date();

        expect(isToday(date)).toBe(true);
        expect(isYesterday(date)).toBe(false);
    });

    test('today at 12am', () => {
        const date = new Date();
        date.setHours(0);
        date.setMinutes(0);

        expect(isToday(date)).toBe(true);
        expect(isYesterday(date)).toBe(false);
    });

    test('today at 11:59pm', () => {
        const date = new Date();
        date.setHours(23);
        date.setMinutes(59);

        expect(isToday(date)).toBe(true);
        expect(isYesterday(date)).toBe(false);
    });

    test('yesterday at 11:59pm', () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        date.setHours(23);
        date.setMinutes(59);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(true);
    });

    test('yesterday at 12am', () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        date.setHours(0);
        date.setMinutes(0);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(true);
    });

    test('two days ago at 11:59pm', () => {
        const date = new Date();
        date.setDate(date.getDate() - 2);
        date.setHours(23);
        date.setMinutes(59);

        expect(isToday(date)).toBe(false);
        expect(isYesterday(date)).toBe(false);
    });
});
