// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import PostOptions from './post_options';

jest.mock('react-intl');

describe('PostOptions', () => {
    const navigator = {
        showModal: jest.fn(),
        dismissModal: jest.fn(),
    };

    const actions = {
        addReaction: jest.fn(),
        deletePost: jest.fn(),
        flagPost: jest.fn(),
        pinPost: jest.fn(),
        removePost: jest.fn(),
        unflagPost: jest.fn(),
        unpinPost: jest.fn(),
    };

    const post = {
        id: 'post_id',
        message: 'message',
    };

    const baseProps = {
        actions,
        canAddReaction: true,
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

    test('should match snapshot, showing all possible options', () => {
        const wrapper = shallow(
            <PostOptions {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn((format) => format.defaultMessage)}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, showing Delete option only for system message to user who has permission to delete', () => {
        const wrapper = shallow(
            <PostOptions
                {...baseProps}
                isSystemMessage={true}
            />,
            {context: {intl: {formatMessage: jest.fn((format) => format.defaultMessage)}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, no option for system message to user who doesn\'t have the permission to delete', () => {
        const wrapper = shallow(
            <PostOptions
                {...baseProps}
                isSystemMessage={true}
                canDelete={false}
            />,
            {context: {intl: {formatMessage: jest.fn((format) => format.defaultMessage)}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
