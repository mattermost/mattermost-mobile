// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert, Platform, StatusBar} from 'react-native';
import {shallow} from 'enzyme';
import Permissions from 'react-native-permissions';

import Preferences from '@mm-redux/constants/preferences';

import CameraQuickAction from './index';

jest.mock('react-intl');
jest.mock('react-native-image-picker', () => ({
    launchCamera: jest.fn().mockImplementation((options, callback) => callback({didCancel: true})),
}));

describe('CameraButton', () => {
    const formatMessage = jest.fn();
    const baseProps = {
        testID: 'post_draft.quick_actions.camera_action',
        fileCount: 0,
        maxFileCount: 5,
        onShowFileMaxWarning: jest.fn(),
        theme: Preferences.THEMES.default,
        onUploadFiles: jest.fn(),
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<CameraQuickAction {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should return permission false if permission is denied in iOS', async () => {
        jest.spyOn(Permissions, 'check').mockReturnValue(Permissions.RESULTS.UNAVAILABLE);
        jest.spyOn(Permissions, 'request').mockReturnValue(Permissions.RESULTS.DENIED);

        const wrapper = shallow(
            <CameraQuickAction {...baseProps}/>,
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
            <CameraQuickAction {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        const hasPermission = await wrapper.instance().hasCameraPermission();
        expect(Permissions.check).toHaveBeenCalled();
        expect(Permissions.request).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalled();
        expect(hasPermission).toBe(false);
    });

    test('hasCameraPermission returns true when permission has been granted', async () => {
        const platformPermissions = [{
            platform: 'ios',
            permission: Permissions.PERMISSIONS.IOS.CAMERA,
        }, {
            platform: 'android',
            permission: Permissions.PERMISSIONS.ANDROID.CAMERA,
        }];

        for (let i = 0; i < platformPermissions.length; i++) {
            const {platform, permission} = platformPermissions[i];
            Platform.OS = platform;

            const check = jest.spyOn(Permissions, 'check');
            const request = jest.spyOn(Permissions, 'request');
            request.mockReturnValue(Permissions.RESULTS.GRANTED);

            const wrapper = shallow(
                <CameraQuickAction {...baseProps}/>,
                {context: {intl: {formatMessage}}},
            );
            const instance = wrapper.instance();

            check.mockReturnValueOnce(Permissions.RESULTS.DENIED);
            let hasPermission = await instance.hasCameraPermission(); // eslint-disable-line no-await-in-loop
            expect(check).toHaveBeenCalledWith(permission);
            expect(request).toHaveBeenCalled();
            expect(hasPermission).toBe(true);

            check.mockReturnValueOnce(Permissions.RESULTS.UNAVAILABLE);
            hasPermission = await instance.hasCameraPermission(); // eslint-disable-line no-await-in-loop
            expect(check).toHaveBeenCalledWith(permission);
            expect(request).toHaveBeenCalled();
            expect(hasPermission).toBe(true);
        }
    });

    test('should re-enable StatusBar after ImagePicker launchCamera finishes', async () => {
        const wrapper = shallow(
            <CameraQuickAction {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        const instance = wrapper.instance();
        jest.spyOn(instance, 'hasCameraPermission').mockReturnValue(true);
        jest.spyOn(StatusBar, 'setHidden');

        await instance.attachFileFromCamera();
        expect(StatusBar.setHidden).toHaveBeenCalledWith(false);
    });
});
