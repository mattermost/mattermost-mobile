// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import EditProfile from './edit_profile.js';

jest.mock('react-intl');
jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('edit_profile', () => {
    const navigator = {
        setOnNavigatorEvent: jest.fn(),
        setButtons: jest.fn(),
        dismissModal: jest.fn(),
        push: jest.fn(),
    };

    const actions = {
        updateUser: jest.fn(),
        setProfileImageUri: jest.fn(),
        removeProfileImage: jest.fn(),
    };

    const baseProps = {
        actions,
        config: {
            ShowEmailAddress: true,
        },
        theme: Preferences.THEMES.default,
        navigator,
        currentUser: {
            first_name: 'Dwight',
            last_name: 'Schrute',
            username: 'ieatbeets',
            email: 'dwight@schrutefarms.com',
            nickname: 'Dragon',
            position: 'position',
        },
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <EditProfile {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.instance().renderProfilePicture()).toMatchSnapshot();
    });

    test('should match state on handleRemoveProfileImage', () => {
        const newNavigator = {
            dismissModal: jest.fn(),
            setOnNavigatorEvent: jest.fn(),
            setButtons: jest.fn(),
        };
        const wrapper = shallow(
            <EditProfile
                {...baseProps}
                navigator={newNavigator}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        wrapper.setProps({profileImageRemove: false});

        const instance = wrapper.instance();
        instance.emitCanUpdateAccount = jest.fn();
        instance.handleRemoveProfileImage();

        expect(wrapper.state('profileImageRemove')).toEqual(true);
        expect(instance.emitCanUpdateAccount).toHaveBeenCalledTimes(1);
        expect(instance.emitCanUpdateAccount).toBeCalledWith(true);

        expect(newNavigator.dismissModal).toHaveBeenCalledTimes(1);
        expect(newNavigator.dismissModal).toBeCalledWith({animationType: 'none'});
    });
});
