// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated} from 'react-native';
import {shallow} from 'enzyme';

import EventEmitter from '@mm-redux/utils/event_emitter';

import {ViewTypes} from '@constants';

import NetworkIndicator from './network_indicator';

jest.useFakeTimers();

describe('AttachmentFooter', () => {
    Animated.sequence = jest.fn(() => ({
        start: jest.fn((cb) => cb()),
    }));
    Animated.timing = jest.fn(() => ({
        start: jest.fn((cb) => cb()),
    }));

    const baseProps = {
        actions: {
            closeWebSocket: jest.fn(),
            connection: jest.fn(),
            initWebSocket: jest.fn(),
            markChannelViewedAndReadOnReconnect: jest.fn(),
            logout: jest.fn(),
            setChannelRetryFailed: jest.fn(),
            setCurrentUserStatusOffline: jest.fn(),
            startPeriodicStatusUpdates: jest.fn(),
            stopPeriodicStatusUpdates: jest.fn(),
        },
    };

    it('matches snapshot', () => {
        const wrapper = shallow(<NetworkIndicator {...baseProps}/>);
        expect(wrapper).toMatchSnapshot();
    });

    describe('show', () => {
        EventEmitter.emit = jest.fn();
        const wrapper = shallow(<NetworkIndicator {...baseProps}/>);
        const instance = wrapper.instance();

        it('emits INDICATOR_BAR_VISIBLE with true only if not already visible', async () => {
            instance.visible = true;
            instance.show();
            expect(EventEmitter.emit).not.toHaveBeenCalled();

            instance.visible = false;
            instance.show();
            expect(EventEmitter.emit).toHaveBeenCalledWith(ViewTypes.INDICATOR_BAR_VISIBLE, true);
            expect(instance.visible).toBe(true);
            expect(wrapper.state('opacity')).toBe(1);
        });
    });

    describe('connected', () => {
        EventEmitter.emit = jest.fn();
        const wrapper = shallow(<NetworkIndicator {...baseProps}/>);
        const instance = wrapper.instance();

        it('emits INDICATOR_BAR_VISIBLE with false only if visible', async () => {
            instance.visible = false;
            instance.connected();
            expect(EventEmitter.emit).not.toHaveBeenCalled();

            instance.visible = true;
            instance.connected();
            expect(EventEmitter.emit).toHaveBeenCalledWith(ViewTypes.INDICATOR_BAR_VISIBLE, false);
            expect(instance.visible).toBe(false);
            expect(wrapper.state('opacity')).toBe(0);
        });
    });
});
