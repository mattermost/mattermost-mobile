// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated} from 'react-native';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from '@mm-redux/constants/preferences';
import EventEmitter from '@mm-redux/utils/event_emitter';
import * as PostListUtils from '@mm-redux/utils/post_list';

import ViewTypes from '@constants/view';

import MoreMessagesButton, {
    MIN_INPUT,
    MAX_INPUT,
    INDICATOR_BAR_FACTOR,
    CANCEL_TIMER_DELAY,
} from './more_messages_button.js';

describe('MoreMessagesButton', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        postIds: [],
        channelId: 'channel-id',
        unreadCount: 0,
        loadingPosts: false,
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

    describe('constructor', () => {
        it('should set state and instance values', () => {
            const instance = new MoreMessagesButton({...baseProps});
            expect(instance.state).toStrictEqual({moreText: ''});
            expect(instance.top).toEqual(new Animated.Value(0));
            expect(instance.disableViewableItemsHandler).toBe(false);
        });
    });

    describe('lifecycle methods', () => {
        test('componentDidMount should register indicator visibility listener, viewable items listener, and scroll end index listener', () => {
            EventEmitter.on = jest.fn();
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.onIndicatorBarVisible = jest.fn();
            instance.onViewableItemsChanged = jest.fn();
            instance.onScrollEndIndex = jest.fn();

            // While componentDidMount is called when the component is mounted with `shallow()` above,
            // instance.onIndicatorBarVisible, instance.onViewableItemsChanged, and instance.onScrollEndIndex
            // have not yet been mocked so we call componentDidMount again.
            instance.componentDidMount();

            expect(EventEmitter.on).toHaveBeenCalledWith(ViewTypes.INDICATOR_BAR_VISIBLE, instance.onIndicatorBarVisible);
            expect(baseProps.registerViewableItemsListener).toHaveBeenCalledWith(instance.onViewableItemsChanged);
            expect(instance.removeViewableItemsListener).toBeDefined();
            expect(baseProps.registerScrollEndIndexListener).toHaveBeenCalledWith(instance.onScrollEndIndex);
            expect(instance.removeScrollEndIndexListener).toBeDefined();
        });

        test('componentWillUnmount should remove the indicator bar visible listener, the viewable items listener, the scroll end index listener, and clear all timers', () => {
            jest.useFakeTimers();
            EventEmitter.off = jest.fn();
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.onIndicatorBarVisible = jest.fn();
            instance.removeViewableItemsListener = jest.fn();
            instance.removeScrollEndIndexListener = jest.fn();
            const viewableItemsChangedTimer = jest.fn();
            instance.viewableItemsChangedTimer = viewableItemsChangedTimer;

            instance.componentWillUnmount();
            expect(EventEmitter.off).toHaveBeenCalledWith(ViewTypes.INDICATOR_BAR_VISIBLE, instance.onIndicatorBarVisible);
            expect(instance.removeViewableItemsListener).toHaveBeenCalled();
            expect(instance.removeScrollEndIndexListener).toHaveBeenCalled();
            expect(clearTimeout).toHaveBeenCalledWith(viewableItemsChangedTimer);
            expect(instance.viewableItemsChangedTimer).toBeNull();
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

        test('componentDidUpdate should force cancel when the newMessageLineIndex changes and is viewable', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.cancel = jest.fn();
            instance.viewableItems = [{index: 100}, {index: 101}];

            wrapper.setProps({newMessageLineIndex: baseProps.newMessageLineIndex});
            expect(instance.cancel).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: 99});
            expect(instance.cancel).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: 100});
            expect(instance.cancel).toHaveBeenCalledTimes(1);
            expect(instance.cancel).toHaveBeenCalledWith(true);

            wrapper.setProps({newMessageLineIndex: 101});
            expect(instance.cancel).toHaveBeenCalledTimes(2);
            expect(instance.cancel).toHaveBeenCalledWith(true);

            wrapper.setProps({newMessageLineIndex: 102});
            expect(instance.cancel).toHaveBeenCalledTimes(2);
        });

        test('componentDidUpdate should force cancel when the newMessageLineIndex changes to -1', () => {
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
            expect(instance.cancel).toHaveBeenCalledTimes(1);
            expect(instance.cancel).toHaveBeenCalledWith(true);
        });

        test('componentDidUpdate should set pressed to false and call uncancel when the newMessageLineIndex changes but is not viewable and is not -1', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.pressed = true;
            instance.uncancel = jest.fn();
            instance.viewableItems = [{index: 100}];

            wrapper.setProps({newMessageLineIndex: baseProps.newMessageLineIndex});
            expect(instance.pressed).toBe(true);
            expect(instance.uncancel).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: -1});
            expect(instance.pressed).toBe(true);
            expect(instance.uncancel).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: 100});
            expect(instance.pressed).toBe(true);
            expect(instance.uncancel).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: 101});
            expect(instance.pressed).toBe(false);
            expect(instance.uncancel).toHaveBeenCalledTimes(1);
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

    describe('onIndicatorBarVisible', () => {
        Animated.spring = jest.fn(() => ({
            start: jest.fn(),
        }));
        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should set indicatorBarVisible but not animate if not visible', () => {
            instance.buttonVisible = false;
            expect(instance.indicatorBarVisible).not.toBeDefined();

            instance.onIndicatorBarVisible(true);
            expect(instance.indicatorBarVisible).toBe(true);
            expect(Animated.spring).not.toHaveBeenCalled();

            instance.onIndicatorBarVisible(false);
            expect(instance.indicatorBarVisible).toBe(false);
            expect(Animated.spring).not.toHaveBeenCalledTimes(1);
        });

        it('should animate to MAX_INPUT - INDICATOR_BAR_FACTOR if visible and indicator bar hides', () => {
            instance.buttonVisible = true;
            instance.onIndicatorBarVisible(false);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MAX_INPUT - INDICATOR_BAR_FACTOR,
                useNativeDriver: true,
            });
        });

        it('should animate to MAX_INPUT if visible and indicator becomes visible', () => {
            instance.buttonVisible = true;
            instance.onIndicatorBarVisible(true);
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
            wrapper.setProps({unreadCount: 10});
            instance.setState({moreText: '60+ new messages'});
            const viewableItemsChangedTimer = jest.fn();
            instance.viewableItemsChangedTimer = viewableItemsChangedTimer;
            const autoCancelTimer = jest.fn();
            instance.autoCancelTimer = autoCancelTimer;
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = true;
            instance.viewableItems = [{index: 1}];
            instance.pressed = true;
            instance.canceled = true;

            instance.reset();
            expect(clearTimeout).toHaveBeenCalledWith(viewableItemsChangedTimer);
            expect(instance.viewableItemsChangedTimer).toBeNull();
            expect(clearTimeout).toHaveBeenCalledWith(autoCancelTimer);
            expect(instance.autoCancelTimer).toBeNull();
            expect(instance.hide).toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(false);
            expect(instance.viewableItems).toStrictEqual([]);
            expect(instance.pressed).toBe(false);
            expect(instance.state.moreText).toEqual('');
            expect(instance.canceled).toBe(false);
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
            instance.buttonVisible = true;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: null});
            instance.canceled = false;

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should not animate when not visible but state.moreText is empty', () => {
            instance.buttonVisible = false;
            wrapper.setState({moreText: ''});
            wrapper.setProps({deepLinkURL: null});
            instance.canceled = false;

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should not animate when not visible and state.moreText is not empty but props.deepLinkURL is set', () => {
            instance.buttonVisible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: 'deeplink-url'});
            instance.canceled = false;

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should not animate when not visible, state.moreText is not empty and props.deepLinkURL is not set but canceled is true', () => {
            instance.buttonVisible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: null});
            instance.canceled = true;

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should animate when not visible, state.moreText is not empty, props.deepLinkURL is not set, and canceled is false', () => {
            instance.buttonVisible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: null});
            instance.canceled = false;

            instance.show();
            expect(instance.buttonVisible).toBe(true);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MAX_INPUT - INDICATOR_BAR_FACTOR,
                useNativeDriver: true,
            });
        });

        it('should account for the indicator bar height when the indicator is visible', () => {
            instance.indicatorBarVisible = true;
            instance.buttonVisible = false;
            wrapper.setState({moreText: '1 new message'});
            wrapper.setProps({deepLinkURL: null});
            instance.canceled = false;

            instance.show();
            expect(instance.buttonVisible).toBe(true);
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
            instance.buttonVisible = false;

            instance.hide();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should animate when visible', () => {
            instance.buttonVisible = true;

            instance.hide();
            expect(instance.buttonVisible).toBe(false);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MIN_INPUT + INDICATOR_BAR_FACTOR,
                useNativeDriver: true,
            });
        });

        it('should account for the indicator bar height when the indicator is visible', () => {
            instance.indicatorBarVisible = true;
            instance.buttonVisible = true;

            instance.hide();
            expect(instance.buttonVisible).toBe(false);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: MIN_INPUT,
                useNativeDriver: true,
            });
        });
    });

    describe('cancel', () => {
        jest.useFakeTimers();

        it('should set canceled, hide button, and disable viewable items handler when forced', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.canceled = false;
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = false;

            instance.cancel(true);
            expect(instance.canceled).toBe(true);
            expect(instance.hide).toHaveBeenCalledTimes(1);
            expect(instance.disableViewableItemsHandler).toBe(true);
        });

        it('should set canceled, hide button, and disable viewable items handler when not forced but indicator bar is not visible and posts are not loading', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.canceled = false;
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = false;
            instance.indicatorBarVisible = false;
            wrapper.setProps({loadingPosts: false});

            instance.cancel(false);
            expect(instance.canceled).toBe(true);
            expect(instance.hide).toHaveBeenCalledTimes(1);
            expect(instance.disableViewableItemsHandler).toBe(true);
        });

        it('should delay cancel when not forced but indicator bar is visible', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.canceled = false;
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = false;
            instance.indicatorBarVisible = true;
            instance.autoCancelTimer = null;

            instance.cancel(false);
            expect(instance.canceled).toBe(false);
            expect(instance.hide).not.toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(false);
            expect(instance.autoCancelTimer).toBeDefined();
            expect(setTimeout).toHaveBeenCalledWith(instance.cancel, CANCEL_TIMER_DELAY);

            jest.runOnlyPendingTimers();
        });

        it('should delay cancel when not forced and indicator bar is not visible but posts are loading', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.canceled = false;
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = false;
            instance.indicatorBarVisible = false;
            instance.autoCancelTimer = null;
            wrapper.setProps({loadingPosts: true});

            instance.cancel(false);
            expect(instance.canceled).toBe(false);
            expect(instance.hide).not.toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(false);
            expect(instance.autoCancelTimer).toBeDefined();
            expect(setTimeout).toHaveBeenCalledWith(instance.cancel, CANCEL_TIMER_DELAY);

            jest.runOnlyPendingTimers();
        });
    });

    describe('uncancel', () => {
        it('should set canceled and disableViewableItemsHandler to false and clear autoCancelTimer', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            const autoCancelTimer = jest.fn();
            instance.autoCancelTimer = autoCancelTimer;
            instance.canceled = true;
            instance.disableViewableItemsHandler = true;

            instance.uncancel();
            expect(clearTimeout).toHaveBeenCalledWith(autoCancelTimer);
            expect(instance.autoCancelTimer).toBeNull();
            expect(instance.canceled).toBe(false);
            expect(instance.disableViewableItemsHandler).toBe(false);
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
        instance.componentDidUpdate = jest.fn();
        instance.viewableItemsChangedTimer = null;
        instance.viewableItemsChangedHandler = jest.fn();
        instance.cancel = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return early when newMessageLineIndex <= 0', () => {
            const viewableItems = [{index: 0}, {index: 1}];

            wrapper.setProps({newMessageLineIndex: 0});
            instance.onViewableItemsChanged(viewableItems);
            expect(clearTimeout).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();

            wrapper.setProps({newMessageLineIndex: -1});
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
            const viewableItemsChangedTimer = jest.fn();
            instance.viewableItemsChangedTimer = viewableItemsChangedTimer;

            instance.onViewableItemsChanged(viewableItems);
            expect(clearTimeout).toHaveBeenCalledWith(viewableItemsChangedTimer);
            expect(instance.viewableItemsChangedTimer).toBeNull();
        });

        it('should not call viewableItemsChangedHandler when disabled', () => {
            const viewableItems = [{index: 0}, {index: 1}];
            wrapper.setProps({newMessageLineIndex: 100});

            instance.disableViewableItemsHandler = true;
            instance.onViewableItemsChanged(viewableItems);
            jest.runOnlyPendingTimers();

            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should force cancel and also scroll to newMessageLineIndex when the channel is first loaded and the newMessageLineIndex is viewable', () => {
            // When the channel is first loaded index 0 will be viewable
            const viewableItems = [{index: 0}, {index: 1}, {index: 2}];
            const newMessageLineIndex = 2;
            wrapper.setProps({newMessageLineIndex});
            instance.disableViewableItemsHandler = false;

            instance.onViewableItemsChanged(viewableItems);
            jest.runOnlyPendingTimers();

            expect(instance.cancel).toHaveBeenCalledTimes(1);
            expect(instance.cancel).toHaveBeenCalledWith(true);
            expect(baseProps.scrollToIndex).toHaveBeenCalledWith(newMessageLineIndex);
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should force cancel and also scroll to newMessageLineIndex when the channel is first loaded and the newMessageLineIndex will be the next viewable item', () => {
            // When the channel is first loaded index 0 will be viewable
            const viewableItems = [{index: 0}, {index: 1}, {index: 2}];
            const newMessageLineIndex = 3;
            wrapper.setProps({newMessageLineIndex});
            instance.disableViewableItemsHandler = false;

            instance.onViewableItemsChanged(viewableItems);
            jest.runOnlyPendingTimers();

            expect(instance.cancel).toHaveBeenCalledTimes(1);
            expect(instance.cancel).toHaveBeenCalledWith(true);
            expect(baseProps.scrollToIndex).toHaveBeenCalledWith(newMessageLineIndex);
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should set autoCancelTimer when the New Message line has been reached', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            const newMessageLineIndex = 3;
            wrapper.setProps({newMessageLineIndex});
            instance.disableViewableItemsHandler = false;
            instance.autoCancelTimer = null;
            instance.cancel = jest.fn();

            instance.onViewableItemsChanged(viewableItems);
            jest.runOnlyPendingTimers();

            expect(instance.autoCancelTimer).toBeDefined();
            expect(setTimeout).toHaveBeenCalledWith(instance.cancel, CANCEL_TIMER_DELAY);
        });

        it('should call viewableItemsChangedHandler with a delay of 100', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            const lastViewableIndex = viewableItems[viewableItems.length - 1].index;
            wrapper.setProps({newMessageLineIndex: 10});
            instance.disableViewableItemsHandler = false;

            instance.onViewableItemsChanged(viewableItems);
            jest.runOnlyPendingTimers();

            expect(instance.cancel).not.toHaveBeenCalled();
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedTimer).not.toBe(null);
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
            expect(instance.viewableItemsChangedHandler).toHaveBeenCalledWith(lastViewableIndex);
        });
    });

    describe('viewableItemsChangedHandler', () => {
        jest.useFakeTimers();

        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.cancel = jest.fn();
        instance.getReadCount = jest.fn();
        instance.show = jest.fn();
        instance.componentDidUpdate = jest.fn();

        it('should force cancel and return early when unreadCount - readCount <= 0', () => {
            const unreadCount = 10;
            const emptyMoreText = '';
            wrapper.setProps({unreadCount});
            wrapper.setState({moreText: emptyMoreText});

            instance.getReadCount.mockReturnValueOnce(unreadCount);
            instance.viewableItemsChangedHandler();
            jest.runOnlyPendingTimers();
            expect(instance.cancel).toHaveBeenCalledTimes(1);
            expect(instance.cancel).toHaveBeenCalledWith(true);
            expect(instance.show).not.toHaveBeenCalled();
            expect(instance.state.moreText).toEqual(emptyMoreText);

            instance.getReadCount.mockReturnValueOnce(unreadCount + 1);
            instance.viewableItemsChangedHandler();
            jest.runOnlyPendingTimers();
            expect(instance.cancel).toHaveBeenCalledTimes(2);
            expect(instance.show).not.toHaveBeenCalled();
            expect(instance.state.moreText).toEqual(emptyMoreText);
        });

        it('should set moreText and call show when unreadCount - readCount > 0', () => {
            const unreadCount = 10;
            const emptyMoreText = '';
            wrapper.setProps({unreadCount});
            wrapper.setState({moreText: emptyMoreText});

            instance.getReadCount.mockReturnValueOnce(unreadCount - 1);
            instance.viewableItemsChangedHandler();
            jest.runOnlyPendingTimers();
            expect(instance.cancel).not.toHaveBeenCalled();
            expect(instance.show).toHaveBeenCalledTimes(1);
            expect(instance.state.moreText.startsWith('1')).toBe(true);

            instance.getReadCount.mockReturnValueOnce(unreadCount - 2);
            instance.viewableItemsChangedHandler();
            jest.runOnlyPendingTimers();
            expect(instance.cancel).not.toHaveBeenCalled();
            expect(instance.show).toHaveBeenCalledTimes(2);
            expect(instance.state.moreText.startsWith('2')).toBe(true);
        });
    });

    describe('getReadCount', () => {
        PostListUtils.messageCount = jest.fn().mockImplementation((postIds) => postIds.length); // eslint-disable-line no-import-assign

        const wrapper = shallowWithIntl(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should return the count of posts up to the lastViewableIndex', () => {
            const postIds = ['post1', 'post2', 'post3'];
            wrapper.setProps({postIds});

            let lastViewableIndex = 0;
            let readCount = instance.getReadCount(lastViewableIndex);
            expect(readCount).toEqual(1);

            lastViewableIndex = 1;
            readCount = instance.getReadCount(lastViewableIndex);
            expect(readCount).toEqual(2);

            lastViewableIndex = 2;
            readCount = instance.getReadCount(lastViewableIndex);
            expect(readCount).toEqual(3);

            lastViewableIndex = 3;
            readCount = instance.getReadCount(lastViewableIndex);
            expect(readCount).toEqual(3);
        });
    });

    describe('onScrollEndIndex', () => {
        it('should set pressed to false', () => {
            const wrapper = shallowWithIntl(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();

            instance.pressed = true;
            instance.onScrollEndIndex();
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
