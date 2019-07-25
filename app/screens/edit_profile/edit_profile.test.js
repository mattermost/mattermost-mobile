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
    const actions = {
        updateUser: jest.fn(),
        setProfileImageUri: jest.fn(),
        removeProfileImage: jest.fn(),
        popTopScreen: jest.fn(),
        dismissModal: jest.fn(),
        setButtons: jest.fn(),
    };

    const baseProps = {
        actions,
        firstNameDisabled: true,
        lastNameDisabled: true,
        nicknameDisabled: true,
        positionDisabled: true,
        theme: Preferences.THEMES.default,
        currentUser: {
            first_name: 'Dwight',
            last_name: 'Schrute',
            username: 'ieatbeets',
            email: 'dwight@schrutefarms.com',
            nickname: 'Dragon',
            position: 'position',
        },
        commandType: 'ShowModal',
        componentId: 'component-id',
        isLandscape: false,
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <EditProfile {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.instance().renderProfilePicture()).toMatchSnapshot();
    });

    test('should match state on handleRemoveProfileImage', () => {
        const wrapper = shallow(
            <EditProfile
                {...baseProps}
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

        expect(baseProps.actions.dismissModal).toHaveBeenCalledTimes(1);
    });
});
