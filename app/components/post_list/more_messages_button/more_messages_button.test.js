// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated} from 'react-native';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import MoreMessagesButton, {SHOWN_TOP, HIDDEN_TOP} from './more_messages_button.js';

describe('MoreMessagesButton', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        postIds: [],
        channelId: 'channel-id',
        unreadCount: 0,
        initialIndex: 0,
        scrollToIndex: jest.fn(),
        registerViewableItemsListener: jest.fn(() => {
            return jest.fn();
        }),
    };

    it('should match snapshot', () => {
        const wrapper = shallow(
            <MoreMessagesButton {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    describe('lifecycle methods', () => {
        it('should register the viewable items listener and call reset on componentDidMount', () => {
            const wrapper = shallow(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.reset = jest.fn();

            // While componentDidMount is called when the component is mounted with `shallow()` above,
            // instance.reset has not yet been mocked so we call componentDidMount again.
            instance.componentDidMount();
            expect(instance.removeListener).toBeDefined();
            expect(instance.reset).toHaveBeenCalled();
        });

        it('should remove the viewable items listener and cancel the timer on componentWillUnmount', () => {
            jest.useFakeTimers();
            const wrapper = shallow(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.removeListener = jest.fn();
            instance.viewableItemsChangedTimer = jest.fn();

            instance.componentWillUnmount();
            expect(instance.removeListener).toHaveBeenCalled();
            expect(clearTimeout).toHaveBeenCalledWith(instance.viewableItemsChangedTimer);
        });

        it('should call reset when the channelId changes on componentDidUpdate', () => {
            const wrapper = shallow(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.reset = jest.fn();

            wrapper.setProps({channelId: baseProps.channelId});
            expect(instance.reset).not.toHaveBeenCalled();

            wrapper.setProps({channelId: `not-${baseProps.channelId}`});
            expect(instance.reset).toHaveBeenCalled();
        });
    });

    describe('reset', () => {
        it('should reset values and call hide', () => {
            const wrapper = shallow(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.viewableItemsChangedTimer = jest.fn();
            instance.hide = jest.fn();
            instance.prevInitialIndex = 100;
            instance.disableViewableItemsHandler = true;

            instance.reset();
            expect(clearTimeout).toHaveBeenCalledWith(instance.viewableItemsChangedTimer);
            expect(instance.hide).toHaveBeenCalled();
            expect(instance.prevInitialIndex).toEqual(0);
            expect(instance.disableViewableItemsHandler).toEqual(false);
        });
    });

    describe('show', () => {
        Animated.spring = jest.fn(() => ({
            start: jest.fn(),
        }));
        const wrapper = shallow(
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

        it('should not animate not visible but state.moreCount <= 0', () => {
            instance.visible = false;
            wrapper.setState({moreCount: 0});
            wrapper.setProps({deepLinkURL: null});

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();

            wrapper.setState({moreCount: -1});
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should not animate when not visible and state.moreCount > 0 but props.deepLinkURL is set', () => {
            instance.visible = false;
            wrapper.setState({moreCount: 10});
            wrapper.setProps({deepLinkURL: 'deeplink-url'});

            instance.show();
            expect(Animated.spring).not.toHaveBeenCalled();
        });

        it('should animate when not visible, state.moreCount > 0, and props.deepLinkURL is not set', () => {
            instance.visible = false;
            wrapper.setState({moreCount: 10});
            wrapper.setProps({deepLinkURL: null});

            instance.show();
            expect(instance.visible).toBe(true);
            expect(Animated.spring).toHaveBeenCalledWith(instance.top, {
                toValue: SHOWN_TOP,
                useNativeDriver: false,
            });
        });
    });

    describe('hide', () => {
        Animated.spring = jest.fn(() => ({
            start: jest.fn(),
        }));
        const wrapper = shallow(
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
                toValue: HIDDEN_TOP,
                useNativeDriver: false,
            });
        });
    });

    describe('cancel', () => {
        it('should hide button and disable viewable items handler', () => {
            const wrapper = shallow(
                <MoreMessagesButton {...baseProps}/>,
            );
            const instance = wrapper.instance();
            instance.hide = jest.fn();
            instance.disableViewableItemsHandler = false;

            instance.cancel();
            expect(instance.hide).toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(true);
        });
    });

    describe('onMoreMessagesPress', () => {
        const wrapper = shallow(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should return early when the initialIndex equals prevInitialIndex', () => {
            instance.prevInitialIndex = 1;
            wrapper.setProps({initialIndex: 1});
            instance.onMoreMessagesPress();

            expect(instance.prevInitialIndex).toEqual(1);
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
        });

        it('should set prevInitialIndex and scroll to the initial index', () => {
            instance.prevInitialIndex = null;
            wrapper.setProps({initialIndex: 1});
            instance.onMoreMessagesPress();

            expect(instance.prevInitialIndex).toEqual(1);
            expect(baseProps.scrollToIndex).toHaveBeenCalledWith(1);
        });
    });

    describe('onViewableItemsChanged', () => {
        jest.useFakeTimers();
        const wrapper = shallow(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should return early when initial when initialIndex <= 0', () => {
            const viewableItems = [{index: 0}, {index: 1}];
            wrapper.setProps({initialIndex: 0});

            instance.viewableItemsChangedTimer = setTimeout(jest.fn());
            instance.disableViewableItemsHandler = false;
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(clearTimeout).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should return early when viewableItems length is 0', () => {
            const viewableItems = [];
            wrapper.setProps({initialIndex: 1});

            instance.viewableItemsChangedTimer = setTimeout(jest.fn());
            instance.disableViewableItemsHandler = false;
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(clearTimeout).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should clear viewableItemsChangedTimer when set', () => {
            const viewableItems = [{index: 0}, {index: 1}];
            wrapper.setProps({initialIndex: 1});

            instance.viewableItemsChangedTimer = null;
            instance.disableViewableItemsHandler = false;
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(clearTimeout).not.toHaveBeenCalled();

            instance.viewableItemsChangedTimer = jest.fn();
            instance.onViewableItemsChanged(viewableItems);
            expect(clearTimeout).toHaveBeenCalledWith(instance.viewableItemsChangedTimer);
        });

        it('should not call viewableItemsChangedHandler when disabled', () => {
            const viewableItems = [{index: 0}, {index: 1}];
            wrapper.setProps({initialIndex: 1});

            instance.viewableItemsChangedTimer = null;
            instance.disableViewableItemsHandler = true;
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(instance.viewableItemsChangedTimer).toBe(null);
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
        });

        it('should hide button when the initialIndex is viewable and >= to the unreadCount', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            wrapper.setProps({initialIndex: 3, unreadCount: 3});

            instance.viewableItemsChangedTimer = null;
            instance.disableViewableItemsHandler = false;
            instance.hide = jest.fn();
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(instance.hide).toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(true);
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedTimer).toBe(null);
        });

        it('should hide button and also scroll to initialIndex when the channel is first loaded and the initialIndex is viewable', () => {
            // When the channel is first loaded index 0 will be viewable
            const viewableItems = [{index: 0}, {index: 1}, {index: 2}];
            const initialIndex = 2;
            wrapper.setProps({initialIndex, unreadCount: 1});

            instance.viewableItemsChangedTimer = null;
            instance.disableViewableItemsHandler = false;
            instance.hide = jest.fn();
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(instance.hide).toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(true);
            expect(baseProps.scrollToIndex).toHaveBeenCalledWith(initialIndex);
            expect(instance.viewableItemsChangedHandler).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedTimer).toBe(null);
        });

        it('should call viewableItemsChangedHandler with a delay of 0 when first called', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            const viewableIndeces = viewableItems.map((item) => item.index);
            wrapper.setProps({initialIndex: 10, unreadCount: 20});

            instance.viewableItemsChangedTimer = null;
            instance.disableViewableItemsHandler = false;
            instance.hide = jest.fn();
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(instance.hide).not.toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(false);
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedTimer).not.toBe(null);
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);
            jest.advanceTimersByTime(0);
            expect(instance.viewableItemsChangedHandler).toHaveBeenCalledWith(viewableIndeces);
        });

        it('should call viewableItemsChangedHandler with a delay of 100 for subsequent calls', () => {
            const viewableItems = [{index: 1}, {index: 2}, {index: 3}];
            const viewableIndeces = viewableItems.map((item) => item.index);
            wrapper.setProps({initialIndex: 10, unreadCount: 20});

            // viewableItemsChangedTimer is non-null after the first viewableItemsChangedHandler call
            instance.viewableItemsChangedTimer = jest.fn();
            instance.disableViewableItemsHandler = false;
            instance.hide = jest.fn();
            instance.viewableItemsChangedHandler = jest.fn();
            instance.onViewableItemsChanged(viewableItems);

            expect(instance.hide).not.toHaveBeenCalled();
            expect(instance.disableViewableItemsHandler).toBe(false);
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.viewableItemsChangedTimer).not.toBe(null);
            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
            jest.advanceTimersByTime(100);
            expect(instance.viewableItemsChangedHandler).toHaveBeenCalledWith(viewableIndeces);
        });
    });

    describe('viewableItemsChangedHandler', () => {
        const wrapper = shallow(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.show = jest.fn();

        it('should do nothing when viewableIndeces includes initialIndex', () => {
            wrapper.setProps({initialIndex: 2});
            const viewableIndeces = [0, 1, 2];

            instance.viewableItemsChangedHandler(viewableIndeces);
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.show).not.toHaveBeenCalled();
        });

        it('should set moreCount and call show when unreadCount minus last index > 0', () => {
            const unreadCount = 10;
            const initialMoreCount = 0;
            wrapper.setProps({initialIndex: 10, unreadCount});
            wrapper.setState({moreCount: initialMoreCount});

            let viewableIndeces = [11, 12, 13];
            let nextMoreCount = unreadCount - viewableIndeces[viewableIndeces.length - 1];
            expect(nextMoreCount).toEqual(-3);

            instance.viewableItemsChangedHandler(viewableIndeces);
            expect(instance.state.moreCount).toEqual(initialMoreCount);
            expect(instance.show).not.toHaveBeenCalled();

            viewableIndeces = [0, 1, 2];
            nextMoreCount = unreadCount - viewableIndeces[viewableIndeces.length - 1];
            expect(nextMoreCount).toEqual(8);

            instance.viewableItemsChangedHandler(viewableIndeces);
            expect(baseProps.scrollToIndex).not.toHaveBeenCalled();
            expect(instance.state.moreCount).toEqual(nextMoreCount);
            expect(instance.show).toHaveBeenCalled();
        });
    });

    describe('moreMessagesText', () => {
        const wrapper = shallow(
            <MoreMessagesButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        it('should return `{count} new messages` on first initialIndex when count <= 60', () => {
            instance.prevInitialIndex = 0;

            let moreCount = 60;
            wrapper.setState({moreCount});
            let text = instance.moreMessagesText();
            expect(text).toEqual(`${moreCount} new messages`);

            moreCount = 59;
            wrapper.setState({moreCount});
            text = instance.moreMessagesText();
            expect(text).toEqual(`${moreCount} new messages`);
        });

        it('should return `{count} more new messages` on subsequent initialIndex when count <= 60', () => {
            instance.prevInitialIndex = 1;

            let moreCount = 60;
            wrapper.setState({moreCount});
            let text = instance.moreMessagesText();
            expect(text).toEqual(`${moreCount} more new messages`);

            moreCount = 59;
            wrapper.setState({moreCount});
            text = instance.moreMessagesText();
            expect(text).toEqual(`${moreCount} more new messages`);
        });

        it('should return `60+ new messages` on first initialIndex when count > 60', () => {
            instance.prevInitialIndex = 0;

            let moreCount = 61;
            wrapper.setState({moreCount});
            let text = instance.moreMessagesText();
            expect(text).toEqual('60+ new messages');

            moreCount = 62;
            wrapper.setState({moreCount});
            text = instance.moreMessagesText();
            expect(text).toEqual('60+ new messages');
        });

        it('should return `60+ more new messages` on subsequent initialIndex when count > 60', () => {
            instance.prevInitialIndex = 1;

            let moreCount = 61;
            wrapper.setState({moreCount});
            let text = instance.moreMessagesText();
            expect(text).toEqual('60+ more new messages');

            moreCount = 62;
            wrapper.setState({moreCount});
            text = instance.moreMessagesText();
            expect(text).toEqual('60+ more new messages');
        });

        it('should return `1 new message` on first initialIndex when count === 1', () => {
            instance.prevInitialIndex = 0;

            const moreCount = 1;
            wrapper.setState({moreCount});
            const text = instance.moreMessagesText();
            expect(text).toEqual('1 new message');
        });

        it('should return `1 more new message` on subsequent initialIndex when count === 1', () => {
            instance.prevInitialIndex = 1;

            const moreCount = 1;
            wrapper.setState({moreCount});
            const text = instance.moreMessagesText();
            expect(text).toEqual('1 more new message');
        });
    });
});
