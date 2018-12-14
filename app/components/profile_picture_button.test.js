// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import ProfilePictureButton from './profile_picture_button.js';

import {Client4} from 'mattermost-redux/client';

describe('profile_picture_button', () => {
    const navigator = {
        setOnNavigatorEvent: jest.fn(),
        setButtons: jest.fn(),
        dismissModal: jest.fn(),
        push: jest.fn(),
    };

    const baseProps = {
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
        blurTextBox: jest.fn(),
        maxFileSize: 20 * 1024 * 1024,
        uploadFiles: jest.fn(),
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <ProfilePictureButton {...baseProps}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should NOT return option to remove when profile picture is default', () => {
        Client4.getProfilePictureUrl = jest.fn(() => 'image.png');
        const wrapper = shallow(
            <ProfilePictureButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        // test default image (WITHOUT query param)
        instance.getRemoveProfileImageOption();
        expect(wrapper.state('extraOptions')).toEqual([null]);
    });

    test('should return option to remove profile picture if customized', () => {
        Client4.getProfilePictureUrl = jest.fn(() => 'image.png?query');
        const wrapper = shallow(
            <ProfilePictureButton {...baseProps}/>,
        );
        const instance = wrapper.instance();

        // test custom image (WITH query param)
        instance.getRemoveProfileImageOption();
        expect(wrapper.state('extraOptions')).not.toEqual([null]);
    });
});
