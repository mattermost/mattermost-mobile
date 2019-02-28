// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import PostOptions from './post_options';

jest.mock('react-intl');

describe('PostOptions', () => {
    const actions = {
        addReaction: jest.fn(),
        deletePost: jest.fn(),
        flagPost: jest.fn(),
        pinPost: jest.fn(),
        removePost: jest.fn(),
        unflagPost: jest.fn(),
        unpinPost: jest.fn(),
        selectPost: jest.fn(),
        loadThreadIfNecessary: jest.fn(),
    };

    const navigator = {
        showModal: jest.fn(),
        dismissModal: jest.fn(),
        push: jest.fn(),
    };

    const post = {
        root_id: 'root_id',
        id: 'id',
        message: 'message',
        is_pinned: false,
        channel_id: 'channel_id',
    };

    const baseProps = {
        actions,
        canAddReaction: true,
        canReply: true,
        canDelete: true,
        canPin: true,
        canEdit: true,
        canEditUntil: 1,
        channelIsReadOnly: false,
        currentTeamUrl: 'stub-team',
        deviceHeight: 800,
        hasBeenDeleted: false,
        isFlagged: false,
        isMyPost: true,
        managedConfig: {},
        navigator,
        post,
        showAddReaction: true,
        theme: Preferences.THEMES.default,
    };

    const context = {context: {intl: {formatMessage: ({defaultMessage}) => defaultMessage}}};

    test('should match snapshot', () => {
        const wrapper = shallow(<PostOptions {...baseProps}/>, context);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should load thread', () => {
        const wrapper = shallow(<PostOptions {...baseProps}/>, context);

        wrapper.findWhere((node) => node.key() === 'reply').simulate('press');
        expect(actions.loadThreadIfNecessary).toBeCalled();
    });

    test('should not show reply option', () => {
        Object.assign(baseProps, {canReply: false});
        const wrapper = shallow(<PostOptions {...baseProps}/>, context);

        expect(wrapper.findWhere((node) => node.key() === 'reply')).toMatchObject({});
    });
});
