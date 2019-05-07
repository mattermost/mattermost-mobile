// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import PostOptions from './post_options';

jest.mock('react-intl');

jest.mock('Alert', () => {
    return {
        alert: jest.fn(),
    };
});

describe('PostOptions', () => {
    const navigator = {
        showModal: jest.fn(),
        dismissModal: jest.fn(),
        push: jest.fn(),
    };

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

    const post = {
        root_id: 'root_id',
        id: 'post_id',
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
        canEditUntil: -1,
        channelIsReadOnly: false,
        currentTeamUrl: 'http://localhost:8065/team-name',
        deviceHeight: 600,
        hasBeenDeleted: false,
        isFlagged: false,
        isMyPost: true,
        isSystemMessage: false,
        managedConfig: {},
        navigator,
        post,
        showAddReaction: true,
        theme: Preferences.THEMES.default,
    };

    function getWrapper(props = {}) {
        return shallow(
            <PostOptions
                {...baseProps}
                {...props}
            />,
            {context: {intl: {formatMessage: ({defaultMessage}) => defaultMessage}}}
        );
    }

    test('should match snapshot, showing all possible options', () => {
        const wrapper = getWrapper();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, showing Delete option only for system message to user who has permission to delete', () => {
        const wrapper = getWrapper({isSystemMessage: true});

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, no option for system message to user who doesn\'t have the permission to delete', () => {
        const wrapper = getWrapper({isSystemMessage: true, canDelete: false});

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should load thread', () => {
        const wrapper = getWrapper();

        wrapper.findWhere((node) => node.key() === 'reply').simulate('press');
        expect(actions.loadThreadIfNecessary).toBeCalled();
    });

    test('should not show reply option', () => {
        const wrapper = getWrapper({canReply: false});

        expect(wrapper.findWhere((node) => node.key() === 'reply')).toMatchObject({});
    });

    test('should remove post after delete', () => {
        const wrapper = getWrapper();

        wrapper.findWhere((node) => node.key() === 'delete').simulate('press');
        expect(Alert.alert).toBeCalled();

        // Trigger on press of Delete in the Alert
        Alert.alert.mock.calls[0][2][1].onPress();

        expect(actions.deletePost).toBeCalled();
        expect(actions.removePost).toBeCalled();
    });
});
