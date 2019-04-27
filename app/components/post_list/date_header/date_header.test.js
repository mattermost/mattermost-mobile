// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-nested-callbacks */

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import DateHeader from './date_header.js';

describe('DateHeader', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        timeZone: null,
    };

    describe('component should match snapshot', () => {
        it('without suffix', () => {
            const props = {
                ...baseProps,
                date: 1531152392,
            };
            const wrapper = shallow(
                <DateHeader {...props}/>,
                {context: {intl: {formatMessage: jest.fn()}}},
            );

            expect(wrapper.getElement()).toMatchSnapshot();
        });

        it('with suffix', () => {
            const props = {
                ...baseProps,
                date: 1531152392,
            };
            const wrapper = shallow(
                <DateHeader {...props}/>,
                {context: {intl: {formatMessage: jest.fn()}}},
            );

            expect(wrapper.getElement()).toMatchSnapshot();
        });

        it('when timezone is set', () => {
            const props = {
                ...baseProps,
                date: 1531152392,
                timeZone: 'America/New_York',
            };
            const wrapper = shallow(
                <DateHeader {...props}/>,
                {context: {intl: {formatMessage: jest.fn()}}},
            );

            expect(wrapper.getElement()).toMatchSnapshot();
        });
    });
});
