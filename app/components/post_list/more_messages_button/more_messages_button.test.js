// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated} from 'react-native';
import {shallowWithIntl} from 'test/intl-test-helper';

import EventEmitter from '@mm-redux/utils/event_emitter';
import Preferences from '@mm-redux/constants/preferences';

import ViewTypes from '@constants/view';

import MoreMessagesButton, {MIN_INPUT, MAX_INPUT, INDICATOR_FACTOR} from './more_messages_button.js';

describe('MoreMessagesButton', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        postIds: [],
        channelId: 'channel-id',
        unreadCount: 0,
        newMessageLineIndex: 0,
        scrollToIndex: jest.fn(),
        registerViewableItemsListener: jest.fn(() => {
            return jest.fn();
        }),
        registerScrollEndIndexListener: jest.fn(() => {
            return jest.fn();
        }),
    };

    it('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    describe('lifecycle methods', () => {
        test('componentDidMount should register network indicator visible listener, viewable items listener, and scroll end index listener', () => {
            EventEmitter.on = jest.fn();
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.onNetworkIndicatorVisible = jest.fn();
            instance.onViewableItemsChanged = jest.fn();
            instance.onScrollEndIndex = jest.fn();

            // While componentDidMount is called when the component is mounted with `shallow()` above,
            // instance.onNetworkIndicatorVisible, instance.onViewableItemsChanged, and instance.onScrollEndIndex
            // have not yet been mocked so we call componentDidMount again.
            instance.componentDidMount();

            expect(EventEmitter.on).toHaveBeenCalledWith(ViewTypes.NETWORK_INDICATOR_VISIBLE, instance.onNetworkIndicatorVisible);
            expect(baseProps.registerViewableItemsListener).toHaveBeenCalledWith(instance.onViewableItemsChanged);
            expect(instance.removeViewableItemsListener).toBeDefined();
            expect(baseProps.registerScrollEndIndexListener).toHaveBeenCalledWith(instance.onScrollEndIndex);
            expect(instance.removeScrollEndIndexListener).toBeDefined();
        });

        test('componentWillUnmount should remove the network indicator visible listener, the viewable items listener, the scroll end index listener, and clear all timers', () => {
            jest.useFakeTimers();
            EventEmitter.off = jest.fn();
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.onNetworkIndicatorVisible = jest.fn();
            instance.removeViewableItemsListener = jest.fn();
            instance.removeScrollEndIndexListener = jest.fn();
            instance.viewableItemsChangedTimer = jest.fn();
            instance.moreTextTimer = jest.fn();

            instance.componentWillUnmount();
            expect(EventEmitter.off).toHaveBeenCalledWith(ViewTypes.NETWORK_INDICATOR_VISIBLE, instance.onNetworkIndicatorVisible);
            expect(instance.removeViewableItemsListener).toHaveBeenCalled();
            expect(instance.removeScrollEndIndexListener).toHaveBeenCalled();
            expect(clearTimeout).toHaveBeenCalledWith(instance.viewableItemsChangedTimer);
            expect(clearTimeout).toHaveBeenCalledWith(instance.moreTextTimer);
        });

        test('componentDidUpdate should call reset when the channelId changes', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.reset = jest.fn();

            wrapper.setProps({channelId: baseProps.channelId});
            expect(instance.reset).not.toHaveBeenCalled();

            wrapper.setProps({channelId: `not-${baseProps.channelId}`});
            expect(instance.reset).toHaveBeenCalled();
        });

        test('componentDidUpdate should set pressed to false when the newMessageLineIndex changes', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.pressed = true;

            wrapper.setProps({newMessageLineIndex: baseProps.newMessageLineIndex});
            expect(instance.pressed).toBe(true);

            wrapper.setProps({newMessageLineIndex: baseProps.newMessageLineIndex + 1});
            expect(instance.pressed).toBe(false);
        });

        test('componentDidUpdate should call cancel when the unreadCount decreases but is not 0', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.cancel = jest.fn();

            wrapper.setProps({unreadCount: baseProps.unreadCount});
            expect(instance.cancel).not.toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(false);

            wrapper.setProps({unreadCount: baseProps.unreadCount + 10});
            expect(instance.cancel).not.toHaveBeenCalled();

            wrapper.setProps({unreadCount: 1});
            expect(instance.cancel).toHaveBeenCalledTimes(1);

            wrapper.setProps({unreadCount: 0});
            expect(instance.cancel).toHaveBeenCalledTimes(1);
        });

        test('componentDidUpdate should call cancel when the newMessageLineIndex changes to -1', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.cancel = jest.fn();

            wrapper.setProps({newMessageLineIndex: baseProps.newMessageLineIndex});
            expect(instance.cancel).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: baseProps.newMessageLineIndex + 10});
            expect(instance.cancel).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: -1});
            expect(instance.cancel).toHaveBeenCalled();
        });

        test('componentDidUpdate should call onViewableItemsChanged when the unreadCount increases from 0', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.onViewableItemsChanged = jest.fn();
            instance.viewableItems = [{index: 1}];

            wrapper.setProps({unreadCount: 0});
            expect(instance.onViewableItemsChanged).not.toHaveBeenCalled();

            wrapper.setProps({unreadCount: 1});
            expect(instance.onViewableItemsChanged).toHaveBeenCalledTimes(1);
            expect(instance.onViewableItemsChanged).toHaveBeenCalledWith(instance.viewableItems);

            wrapper.setProps({unreadCount: 2});
            expect(instance.onViewableItemsChanged).toHaveBeenCalledTimes(1);
        });
    });

    describe('onNetworkIndicatorVisible', () => {
        Animated.spring = jest.fn(() => ({
            start: jest.fn(),
        }));
        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should set networkIndicatorVisible but not animate if not visible', () => {
            instance.visible = false;
            expect(instance.networkIndicatorVisible).not.toBeDefined();

            instance.onNetworkIndicatorVisible(true);
            expect(instance.networkIndicatorVisible).toBe(true);
            expect(Animated.spring).not.toHaveBeenCalled();

            instance.onNetworkIndicatorVisible(false);
            expect(instance.networkIndicatorVisible).toBe(false);
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should animate to MAX_INPUT - INDICATOR_FACTOR if visible and network indicator hides', () => {
            instance.visible = true;
            instance.onNetworkIndicatorVisible(false);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MAX_INPUT - INDICATOR_FACTOR,
                useNativeDriver: true,
            });
        });

        it('should animate to MAX_INPUT if visible and indicator becomes visible', () => {
            instance.visible = true;
            instance.onNetworkIndicatorVisible(true);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MAX_INPUT,
                useNativeDriver: true,
            });
        });
    });

    describe('reset', () => {
        it('should reset values and call hide', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.setState({moreText: '60+ new messages'});
            instance.viewableItemsChangedTimer = jest.fn();
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = true;
            instance.viewableItems = [{index: 1}];
            instance.pressed = true;
            instance.scrolledToLastIndex = true;
            instance.canceled = true;

            instance.reset();
            expect(clearTimeout).toHaveBeenCalledWith(instance.viewableItemsChangedTimer);
            expect(instance.hide).toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toEqual(false);
            expect(instance.viewableItems).toStrictEqual([]);
            expect(instance.pressed).toEqual(false);
            expect(instance.scrolledToLastIndex).toEqual(false);
            expect(instance.state.moreText).toEqual('');
            expect(instance.canceled).toEqual(false);
        });
    });

    describe('show', () => {
        Animated.spring = jest.fn(() => ({
            start: jest.fn(),
        }));
        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should not animate when already visible', () => {
            instance.visible = true;
            wrapper.setState({moreCount: 10});
            wrapper.setProps({deepLinkURL: null});

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should not animate when not visible but state.moreText is empty', () => {
            instance.visible = false;
            wrapper.setState({moreText: ''});
            wrapper.setProps({deepLinkURL: null});

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();

            wrapper.setState({moreText: '1 new message'});
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should not animate when not visible and state.moreText is not empty but props.deepLinkURL is set', () => {
            instance.visible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: 'deeplink-url'});

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should not animate when not visible, state.moreText is not empty and props.deepLinkURL is not set but canceled is true', () => {
            instance.visible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: 'null'});
            instance.canceled = true;

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should animate when not visible, state.moreText is not empty, props.deepLinkURL is not set, and canceled is false', () => {
            instance.visible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: null});
            instance.canceled = false;

            instance.show();
            expect(instance.visible).toBe(true);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MAX_INPUT - INDICATOR_FACTOR,
                useNativeDriver: true,
            });
        });

        it('should account for the network indicator height when the indicator is visible', () => {
            instance.networkIndicatorVisible = true;
            instance.visible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: null});

            instance.show();
            expect(instance.visible).toBe(true);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MAX_INPUT,
                useNativeDriver: true,
            });
        });
    });

    describe('hide', () => {
        Animated.spring = jest.fn(() => ({
            start: jest.fn(),
        }));
        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should not animate when not visible', () => {
            instance.visible = false;

            instance.hide();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should animate when visible', () => {
            instance.visible = true;

            instance.hide();
            expect(instance.visible).toBe(false);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MIN_INPUT + INDICATOR_FACTOR,
                useNativeDriver: true,
            });
        });

        it('should account for the network indicator height when the indicator is visible', () => {
            instance.networkIndicatorVisible = true;
            instance.visible = true;

            instance.hide();
            expect(instance.visible).toBe(false);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MIN_INPUT,
                useNativeDriver: true,
            });
        });
    });

    describe('cancel', () => {
        it('should set canceled, hide button, and disable viewable items handler', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.canceled = false;
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = false;

            instance.cancel();
            expect(instance.canceled).toBe(true);
            expect(instance.hide).toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(true);
        });
    });

    describe('onMoreMessagesPress', () => {
        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should return early when pressed is true', () => {
            instance.pressed = true;
            instance.onMoreMessagesPress();

            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.pressed).toBe(true);
        });

        it('should set pressed to true and scroll to the initial index', () => {
            instance.pressed = false;
            instance.onMoreMessagesPress();

            expect(instance.pressed).toBe(true);
            expect(baseProps.scrollToIndex).toHaveBeenCalledWith(baseProps.newMessageLineIndex);
        });
    });

    describe('onViewableItemsChanged', () => {
        jest.useFakeTimers();

        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.viewableItemsChangedTimer = null;
        instance.viewableItemsChangedHandler = jest.fn();
        instance.cancel = jest.fn();

        it('should return early when newMessageLineIndex <= 0', () => {
            const viewableItems = [{index: 0}, {index: 1}];
            wrapper.setProps({newMessageLineIndex: 0});

            instance.onViewableItemsChanged(viewableItems);
            expect(clearTimeout).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should return early when viewableItems length is 0', () => {
            const viewableItems = [];
            wrapper.setProps({newMessageLineIndex: 1});

            instance.onViewableItemsChanged(viewableItems);
            expect(clearTimeout).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should clear viewableItemsChangedTimer when set', () => {
            const viewableItems = [{index: 0}, {index: 1}];
            wrapper.setProps({newMessageLineIndex: 1});
            instance.viewableItemsChangedTimer = jest.fn();

            instance.onViewableItemsChanged(viewableItems);
            expect(clearTimeout).toHaveBeenCalledWith(instance.viewableItemsChangedTimer);
        });

        it('should not call viewableItemsChangedHandler when disabled', () => {
            const viewableItems = [{index: 0}, {index: 1}];
            wrapper.setProps({newMessageLineIndex: 1});

            instance.disableViewableItemsHandler = true;
            instance.onViewableItemsChanged(viewableItems);
            jest.runAllTimers();

            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should cancel button when the newMessageLineIndex is viewable and >= to the unreadCount', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            wrapper.setProps({newMessageLineIndex: 3, unreadCount: 3});
            instance.disableViewableItemsHandler = false;

            instance.onViewableItemsChanged(viewableItems);
            jest.runAllTimers();

            expect(instance.cancel).toHaveBeenCalled();
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should cancel button and also scroll to newMessageLineIndex when the channel is first loaded and the newMessageLineIndex is viewable', () => {
            // When the channel is first loaded index 0 will be viewable
            const viewableItems = [{index: 0}, {index: 1}, {index: 2}];
            const newMessageLineIndex = 2;
            wrapper.setProps({newMessageLineIndex, unreadCount: 1});
            instance.disableViewableItemsHandler = false;

            instance.onViewableItemsChanged(viewableItems);
            jest.runAllTimers();

            expect(instance.cancel).toHaveBeenCalled();
            expect(baseProps.scrollToIndex).toHaveBeenCalledWith(newMessageLineIndex);
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should call viewableItemsChangedHandler with a delay of 0 when first called', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            const viewableIndeces = viewableItems.map((item) => item.index);
            wrapper.setProps({newMessageLineIndex: 10, unreadCount: 20});
            instance.disableViewableItemsHandler = false;

            instance.onViewableItemsChanged(viewableItems);
            jest.runAllTimers();

            expect(instance.cancel).not.toHaveBeenCalled();
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedTimer).not.toBe(null);
            expect(instance.viewableItemsChangedHandler).toHaveBeenCalledWith(viewableIndeces);
        });

        it('should call viewableItemsChangedHandler with a delay of 100 for subsequent calls', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            const viewableIndeces = viewableItems.map((item) => item.index);
            wrapper.setProps({newMessageLineIndex: 10, unreadCount: 20});
            instance.disableViewableItemsHandler = false;

            // viewableItemsChangedTimer is non-null after the first viewableItemsChangedHandler call
            instance.viewableItemsChangedTimer = jest.fn();
            instance.cancel = jest.fn();
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(instance.cancel).not.toHaveBeenCalled();
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedTimer).not.toBe(null);
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
            jest.advanceTimersByTime(100);
            expect(instance.viewableItemsChangedHandler).toHaveBeenCalledWith(viewableIndeces);
        });
    });

    describe('viewableItemsChangedHandler', () => {
        jest.useFakeTimers();

        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.moreTextTimer = jest.fn();
        instance.show = jest.fn();

        it('should only set pressed to false when viewableIndeces includes newMessageLineIndex', () => {
            instance.pressed = true;
            wrapper.setProps({newMessageLineIndex: 2});
            const viewableIndeces = [0, 1, 2];

            instance.viewableItemsChangedHandler(viewableIndeces);
            expect(instance.pressed).toBe(false);
            expect(clearTimeout).not.toHaveBeenCalledWith();
            expect(setTimeout).not.toHaveBeenCalled();
            expect(instance.show).not.toHaveBeenCalled();
        });

        it('should clear timer when viewableIndeces does not include newMessageLineIndex', () => {
            wrapper.setProps({newMessageLineIndex: 3});
            const viewableIndeces = [0, 1, 2];

            instance.viewableItemsChangedHandler(viewableIndeces);
            expect(clearTimeout).toHaveBeenCalledWith(instance.moreTextTimer);
        });

        it('should set moreText and call show when unreadCount minus last index > 0', () => {
            const unreadCount = 10;
            const initialMoreText = '';
            wrapper.setProps({newMessageLineIndex: 10, unreadCount});
            wrapper.setState({moreText: initialMoreText});

            let viewableIndeces = [11, 12, 13];
            let nextMoreCount = unreadCount - viewableIndeces[viewableIndeces.length - 1];
            expect(nextMoreCount).toEqual(-3);

            instance.viewableItemsChangedHandler(viewableIndeces);
            jest.runAllTimers();
            expect(instance.state.moreText).toEqual(initialMoreText);
            expect(instance.show).not.toHaveBeenCalled();

            viewableIndeces = [0, 1, 2];
            nextMoreCount = unreadCount - viewableIndeces[viewableIndeces.length - 1];
            expect(nextMoreCount).toEqual(8);

            instance.viewableItemsChangedHandler(viewableIndeces);
            jest.runAllTimers();
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.state.moreText.startsWith('8')).toBe(true);
            expect(instance.show).toHaveBeenCalled();
        });
    });

    describe('onScrollEndIndex', () => {
        it('should set endIndex and set pressed to false', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            expect(instance.endIndex).toBeUndefined();

            instance.pressed = true;
            instance.onScrollEndIndex(1);
            expect(instance.endIndex).toEqual(1);
            expect(instance.pressed).toBe(false);

            instance.pressed = true;
            instance.onScrollEndIndex(5);
            expect(instance.endIndex).toEqual(5);
            expect(instance.pressed).toBe(false);
        });
    });

    describe('moreText', () => {
        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should return defaultMessage of `{count} new messages` when moreText is empty and count is > 1', () => {
            let moreCount = 2;
            wrapper.setState({moreText: ''});
            let message = instance.moreText(moreCount);
            expect(message).toEqual('2 new messages');

            moreCount = 3;
            wrapper.setState({moreText: ''});
            message = instance.moreText(moreCount);
            expect(message).toEqual('3 new messages');
        });

        it('should return defaultMessage of `{count} more new messages` on subsequent moreText changes with count > 1', () => {
            let moreCount = 2;
            wrapper.setState({moreText: '1 new message'});
            let message = instance.moreText(moreCount);
            expect(message).toEqual('2 more new messages');

            moreCount = 3;
            wrapper.setState({moreText: '1 new message'});
            message = instance.moreText(moreCount);
            expect(message).toEqual('3 more new messages');
        });

        it('should return defaultMessage of `1 new message` when moreText is empty and count === 1', () => {
            const moreCount = 1;
            wrapper.setState({moreText: ''});
            const message = instance.moreText(moreCount);
            expect(message).toEqual('1 new message');
        });

        it('should return defaultMessage of `1 more new message` on subsequent moreText changes when count === 1', () => {
            const moreCount = 1;
            wrapper.setState({moreText: '1 new message'});
            const message = instance.moreText(moreCount);
            expect(message).toEqual('1 more new message');
        });
    });
});
