// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';
import {FlatList} from 'react-native';

import {Preferences} from '@mm-redux/constants';
import {intl} from '@test/intl-test-helper';

import {ThreadList} from './index';

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
        isRefreshing: false,
        listRef: React.useRef<FlatList>(null),
        loadMoreThreads: jest.fn(),
        markAllAsRead,
        onRefresh: jest.fn(),
        testID,
        theme: Preferences.THEMES.denim,
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
    });
});
