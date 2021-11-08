// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import moment from 'moment';
import React from 'react';

import CallDuration from './call_duration';

jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useEffect: (f) => f(),
}));

describe('CallDuration', () => {
    const baseProps = {
        style: {},
        value: moment.now() - 15000,
        updateIntervalInSeconds: 10000,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<CallDuration {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot more in the past', () => {
        const props = {...baseProps, value: moment.now() - ((10 * 60 * 60 * 1000) + (30 * 60 * 1000) + (25 * 1000) + 500)};
        const wrapper = shallow(<CallDuration {...props}/>);

        expect(wrapper.getElement().props.children).toBe('10:30:25');
    });

    test('should match snapshot more in the future', () => {
        const props = {...baseProps, value: moment.now() + 15500};
        const wrapper = shallow(<CallDuration {...props}/>);

        expect(wrapper.getElement().props.children).toBe('00:00');
    });

    test('should re-render after updateIntervalInSeconds', () => {
        jest.useFakeTimers();
        const props = {...baseProps, value: moment.now(), updateIntervalInSeconds: 10};
        const wrapper = shallow(<CallDuration {...props}/>);
        expect(wrapper.getElement().props.children).toBe('00:00');
        jest.advanceTimersByTime(5000);
        expect(wrapper.getElement().props.children).toBe('00:00');
        jest.advanceTimersByTime(5000);
        expect(wrapper.getElement().props.children).toBe('00:10');
        jest.useRealTimers();
    });

    test('should not re-render if updateIntervalInSeconds is not passed', () => {
        jest.useFakeTimers();
        const props = {value: moment.now()};
        const wrapper = shallow(<CallDuration {...props}/>);
        expect(wrapper.getElement().props.children).toBe('00:00');
        jest.advanceTimersByTime(500000000);
        expect(wrapper.getElement().props.children).toBe('00:00');
        jest.useRealTimers();
    });
});
