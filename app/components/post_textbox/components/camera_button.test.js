// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import {shallow} from 'enzyme';
import Permissions from 'react-native-permissions';

import Preferences from 'mattermost-redux/constants/preferences';

import CameraButton from './camera_button';

jest.mock('react-intl');
jest.mock('react-native-image-picker', () => ({
    launchCamera: jest.fn(),
}));

describe('CameraButton', () => {
    const formatMessage = jest.fn();
    const baseProps = {
        fileCount: 0,
        maxFileCount: 5,
        onShowFileMaxWarning: jest.fn(),
        theme: Preferences.THEMES.default,
        uploadFiles: jest.fn(),
        buttonContainerStyle: {},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<CameraButton {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should return permission false if permission is denied in iOS', async () => {
        jest.spyOn(Permissions, 'check').mockReturnValue(Permissions.RESULTS.UNAVAILABLE);
        jest.spyOn(Permissions, 'request').mockReturnValue(Permissions.RESULTS.DENIED);

        const wrapper = shallow(
            <CameraButton {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        const hasPermission = await wrapper.instance().hasCameraPermission();
        expect(Permissions.check).toHaveBeenCalled();
        expect(Permissions.request).toHaveBeenCalled();
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(hasPermission).toBe(false);
    });

    test('should show permission denied alert and return permission false if permission is blocked in iOS', async () => {
        jest.spyOn(Permissions, 'check').mockReturnValue(Permissions.RESULTS.BLOCKED);
        jest.spyOn(Alert, 'alert').mockReturnValue(true);

        const wrapper = shallow(
            <CameraButton {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        const hasPermission = await wrapper.instance().hasCameraPermission();
        expect(Permissions.check).toHaveBeenCalled();
        expect(Permissions.request).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalled();
        expect(hasPermission).toBe(false);
    });
});