// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-nested-callbacks */

import React from 'react';
import {shallow} from 'enzyme';

import DateHeader from './date_header.js';

describe('DateHeader', () => {
    const baseProps = {
        theme: {centerChannelBg: '#aaa', centerChannelColor: '#aaa'},
    };

    describe('component should match snapshot', () => {
        it('without suffix', () => {
            const props = {
                ...baseProps,
                dateLineString: 'date-1531152392',
                index: 0,
            };
            const wrapper = shallow(
                <DateHeader {...props}/>,
                {context: {intl: {formatMessage: jest.fn()}}},
            );

            expect(wrapper).toMatchSnapshot();
        });

        it('with suffix', () => {
            const props = {
                ...baseProps,
                dateLineString: 'date-1531152392-index-2',
                index: 2,
            };
            const wrapper = shallow(
                <DateHeader {...props}/>,
                {context: {intl: {formatMessage: jest.fn()}}},
            );

            expect(wrapper).toMatchSnapshot();
        });
    });
});
