// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import UserListRow from './user_list_row';

jest.mock('react-intl');
jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('UserListRow', () => {
    const formatMessage = jest.fn();
    const baseProps = {
        id: '123455',
        isMyUser: false,
        user: {
            id: '21345',
            username: 'user',
            delete_at: 0,
        },
        theme: Preferences.THEMES.default,
        teammateNameDisplay: 'test',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <UserListRow {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for deactivated user', () => {
        const deactivatedUser = {
            id: '21345',
            username: 'user',
            delete_at: 100,
        };

        const newProps = {
            ...baseProps,
            user: deactivatedUser,
        };

        const wrapper = shallow(
            <UserListRow {...newProps}/>,
            {context: {intl: {formatMessage}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for  currentUser with (you) populated in list', () => {
        const newProps = {
            ...baseProps,
            isMyUser: true,
        };

        const wrapper = shallow(
            <UserListRow {...newProps}/>,
            {context: {intl: {formatMessage}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
