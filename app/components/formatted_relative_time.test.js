// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import moment from 'moment';
import React from 'react';

import FormattedRelativeTime from './formatted_relative_time';

jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useEffect: (f) => f(),
}));

describe('FormattedRelativeTime', () => {
    const baseProps = {
        value: moment.now() - 15000,
        updateIntervalInSeconds: 10000,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<FormattedRelativeTime {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match string in the past', () => {
        const props = {...baseProps, value: moment.now() - ((10 * 60 * 60 * 1000) + (30 * 60 * 1000) + (25 * 1000) + 500)};
        const wrapper = shallow(<FormattedRelativeTime {...props}/>);

        expect(wrapper.getElement().props.children).toBe('11 hours ago');
    });

    test('should match string in the future', () => {
        const props = {...baseProps, value: moment.now() + 15500};
        const wrapper = shallow(<FormattedRelativeTime {...props}/>);

        expect(wrapper.getElement().props.children).toBe('in a few seconds');
    });

    test('should re-render after updateIntervalInSeconds', () => {
        jest.useFakeTimers();
        const props = {...baseProps, value: moment.now(), updateIntervalInSeconds: 120};
        const wrapper = shallow(<FormattedRelativeTime {...props}/>);
        expect(wrapper.getElement().props.children).toBe('a few seconds ago');
        jest.advanceTimersByTime(60000);
        expect(wrapper.getElement().props.children).toBe('a few seconds ago');
        jest.advanceTimersByTime(120000);
        expect(wrapper.getElement().props.children).toBe('2 minutes ago');
        jest.useRealTimers();
    });

    test('should not re-render if updateIntervalInSeconds is not passed', () => {
        jest.useFakeTimers();
        const props = {value: baseProps.value};
        const wrapper = shallow(<FormattedRelativeTime {...props}/>);
        expect(wrapper.getElement().props.children).toBe('a few seconds ago');
        jest.advanceTimersByTime(120000000000);
        expect(wrapper.getElement().props.children).toBe('a few seconds ago');
        jest.useRealTimers();
    });
});
