// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList} from 'react-native';
import * as redux from 'react-redux';
import {shallow} from 'enzyme';

import initialState from '@store/initial_state';
import {intl} from 'test/intl-test-helper';

import ThreadList from './thread_list';

jest.mock('app/components/compass_icon', () => 'Icon');
jest.spyOn(redux, 'useSelector').mockImplementation((callback) => callback(initialState));
jest.spyOn(React, 'useRef').mockReturnValue({
    current: {},
});

describe('Global Thread List', () => {
    const testID = 'thread_list';

    const markAllAsRead = jest.fn();
    const viewAllThreads = jest.fn();
    const viewUnreadThreads = jest.fn();

    const baseProps = {
        haveUnreads: true,
        intl,
        isLoading: false,
        listRef: React.useRef<FlatList>(null),
        loadMoreThreads: jest.fn(),
        markAllAsRead,
        testID,
        threadIds: ['thread1'],
        viewingUnreads: true,
        viewAllThreads,
        viewUnreadThreads,
    };

    const wrapper = shallow(
        <ThreadList
            {...baseProps}
        />,
    );

    test('Should render threads with functional tabs & mark all as read button', () => {
        expect(wrapper.getElement()).toMatchSnapshot();

        const allThreadsTab = wrapper.find({testID: `${testID}.all_threads`}).at(0);
        expect(allThreadsTab.exists()).toBeTruthy();
        allThreadsTab.simulate('press');
        expect(viewAllThreads).toHaveBeenCalled();

        const unreadThreadsTab = wrapper.find({testID: `${testID}.unread_threads`}).at(0);
        expect(unreadThreadsTab.exists()).toBeTruthy();
        unreadThreadsTab.simulate('press');
        expect(viewUnreadThreads).toHaveBeenCalled();

        expect(wrapper.find({testID: `${testID}.unreads_dot`}).exists()).toBeTruthy();

        const markAllAsReadButton = wrapper.find({testID: `${testID}.mark_all_read`}).at(0);
        expect(markAllAsReadButton.exists()).toBeTruthy();
        expect(markAllAsReadButton.props().disabled).toBeFalsy();
        markAllAsReadButton.simulate('press');
        expect(markAllAsRead).toHaveBeenCalled();
    });

    test('Should disable mark all as read and hide dot on UNREADS tab when no unread messages are present', () => {
        wrapper.setProps({
            ...baseProps,
            haveUnreads: false,
        });

        expect(wrapper.find({testID: `${testID}.unreads_dot`}).exists()).toBeFalsy();

        const markAllAsReadButton = wrapper.find({testID: `${testID}.mark_all_read`}).at(0);
        expect(markAllAsReadButton.exists()).toBeTruthy();
        expect(markAllAsReadButton.props().disabled).toBeTruthy();
    });
});
