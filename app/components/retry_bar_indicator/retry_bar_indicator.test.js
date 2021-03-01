// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated} from 'react-native';
import {shallow} from 'enzyme';

import EventEmitter from '@mm-redux/utils/event_emitter';

import ViewTypes from '@constants/view';

import RetryBarIndicator from './retry_bar_indicator.js';

describe('RetryBarIndicator', () => {
    it('should match snapshot', () => {
        const wrapper = shallow(
            <RetryBarIndicator/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    describe('toggleRetryMessage', () => {
        Animated.timing = jest.fn(() => ({
            start: jest.fn((cb) => {
                cb();
            }),
        }));
        EventEmitter.emit = jest.fn();

        const wrapper = shallow(
            <RetryBarIndicator/>,
        );
        const instance = wrapper.instance();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should emit INDICATOR_BAR_VISIBLE with true when show is true', () => {
            const show = true;
            instance.toggleRetryMessage(show);
            expect(EventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(EventEmitter.emit).toHaveBeenCalledWith(ViewTypes.INDICATOR_BAR_VISIBLE, true);
            expect(Animated.timing).toHaveBeenCalledTimes(1);
        });

        it('should emit INDICATOR_BAR_VISIBLE with false when show is false', () => {
            const show = false;
            instance.toggleRetryMessage(show);
            expect(EventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(EventEmitter.emit).toHaveBeenCalledWith(ViewTypes.INDICATOR_BAR_VISIBLE, false);
            expect(Animated.timing).toHaveBeenCalledTimes(1);
        });
    });
});
