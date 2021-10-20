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
        const props = {...baseProps, value: moment.now() - 36000500};
        const wrapper = shallow(<CallDuration {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot more in the future', () => {
        const props = {...baseProps, value: moment.now() + 15500};
        const wrapper = shallow(<CallDuration {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should re-render after updateIntervalInSeconds', () => {
        jest.useFakeTimers();
        const props = {...baseProps, value: moment.now(), updateIntervalInSeconds: 10};
        const wrapper = shallow(<CallDuration {...props}/>);
        jest.advanceTimersByTime(10000);
        expect(wrapper.getElement()).toMatchSnapshot();
        jest.useRealTimers();
    });
});
