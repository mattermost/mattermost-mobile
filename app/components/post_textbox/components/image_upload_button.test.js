// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert, Platform} from 'react-native';
import {shallow} from 'enzyme';
import Permissions from 'react-native-permissions';

import Preferences from 'mattermost-redux/constants/preferences';

import ImageUploadButton from './image_upload_button';

jest.mock('react-intl');
jest.mock('react-native-image-picker', () => ({
    launchCamera: jest.fn(),
}));

describe('ImageUploadButton', () => {
    const formatMessage = jest.fn();
    const baseProps = {
        blurTextBox: jest.fn(),
        fileCount: 0,
        maxFileCount: 5,
        onShowFileMaxWarning: jest.fn(),
        theme: Preferences.THEMES.default,
        uploadFiles: jest.fn(),
        buttonContainerStyle: {},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<ImageUploadButton {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should return permission false if permission is denied in iOS', async () => {
        jest.spyOn(Permissions, 'check').mockReturnValue(Permissions.RESULTS.UNAVAILABLE);
        jest.spyOn(Permissions, 'request').mockReturnValue(Permissions.RESULTS.DENIED);

        const wrapper = shallow(
            <ImageUploadButton {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        const hasPermission = await wrapper.instance().hasPhotoPermission();
        expect(Permissions.check).toHaveBeenCalled();
        expect(Permissions.request).toHaveBeenCalled();
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(hasPermission).toBe(false);
    });

    test('should show permission denied alert and return permission false if permission is blocked in iOS', async () => {
        jest.spyOn(Permissions, 'check').mockReturnValue(Permissions.RESULTS.BLOCKED);
        jest.spyOn(Alert, 'alert').mockReturnValue(true);

        const wrapper = shallow(
            <ImageUploadButton {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        const hasPermission = await wrapper.instance().hasPhotoPermission();
        expect(Permissions.check).toHaveBeenCalled();
        expect(Permissions.request).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalled();
        expect(hasPermission).toBe(false);
    });

    test('hasPhotoPermission returns true when permission has been granted', async () => {
        const platformPermissions = [{
            platform: 'ios',
            permission: Permissions.PERMISSIONS.IOS.PHOTO_LIBRARY,
        }, {
            platform: 'android',
            permission: Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        }];

        for (let i = 0; i < platformPermissions.length; i++) {
            const {platform, permission} = platformPermissions[i];
            Platform.OS = platform;

            const check = jest.spyOn(Permissions, 'check');
            const request = jest.spyOn(Permissions, 'request');
            request.mockReturnValue(Permissions.RESULTS.GRANTED);

            const wrapper = shallow(
                <ImageUploadButton {...baseProps}/>,
                {context: {intl: {formatMessage}}},
            );
            const instance = wrapper.instance();

            check.mockReturnValueOnce(Permissions.RESULTS.DENIED);
            let hasPermission = await instance.hasPhotoPermission(); // eslint-disable-line no-await-in-loop
            expect(check).toHaveBeenCalledWith(permission);
            expect(request).toHaveBeenCalled();
            expect(hasPermission).toBe(true);

            check.mockReturnValueOnce(Permissions.RESULTS.UNAVAILABLE);
            hasPermission = await instance.hasPhotoPermission(); // eslint-disable-line no-await-in-loop
            expect(check).toHaveBeenCalledWith(permission);
            expect(request).toHaveBeenCalled();
            expect(hasPermission).toBe(true);
        }
    });
});