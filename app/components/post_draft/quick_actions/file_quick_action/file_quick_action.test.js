// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert, Platform} from 'react-native';
import Permissions from 'react-native-permissions';

import Preferences from '@mm-redux/constants/preferences';
import {shallowWithIntl} from 'test/intl-test-helper';

import FileQuickAction from './index';

describe('FileQuickAction', () => {
    const baseProps = {
        testID: 'post_draft.quick_actions.file_action',
        fileCount: 0,
        maxFileCount: 5,
        onShowFileMaxWarning: jest.fn(),
        theme: Preferences.THEMES.default,
        onUploadFiles: jest.fn(),
    };

    beforeAll(() => {
        Platform.OS = 'android';
    });

    afterAll(() => {
        Platform.OS = 'ios';
    });

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<FileQuickAction {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should return permission false if permission is denied in Android', async () => {
        jest.spyOn(Permissions, 'check').mockReturnValue(Permissions.RESULTS.UNAVAILABLE);
        jest.spyOn(Permissions, 'request').mockReturnValue(Permissions.RESULTS.DENIED);

        const wrapper = shallowWithIntl(
            <FileQuickAction {...baseProps}/>,
        );

        const hasPermission = await wrapper.instance().hasStoragePermission();
        expect(Permissions.check).toHaveBeenCalled();
        expect(Permissions.request).toHaveBeenCalled();
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(hasPermission).toBe(false);
    });

    test('should show permission denied alert and return permission false if permission is blocked in Android', async () => {
        jest.spyOn(Permissions, 'check').mockReturnValue(Permissions.RESULTS.BLOCKED);
        jest.spyOn(Alert, 'alert').mockReturnValue(true);

        const wrapper = shallowWithIntl(
            <FileQuickAction {...baseProps}/>,
        );

        const hasPermission = await wrapper.instance().hasStoragePermission();
        expect(Permissions.check).toHaveBeenCalled();
        expect(Permissions.request).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalled();
        expect(hasPermission).toBe(false);
    });

    test('hasStoragePermission returns true when permission has been granted', async () => {
        const wrapper = shallowWithIntl(
            <FileQuickAction {...baseProps}/>,
        );
        const instance = wrapper.instance();
        const check = jest.spyOn(Permissions, 'check');
        const request = jest.spyOn(Permissions, 'request');

        // On iOS storage permissions are not checked
        Platform.OS = 'ios';
        let hasPermission = await instance.hasStoragePermission();
        expect(check).not.toHaveBeenCalled();
        expect(request).not.toHaveBeenCalled();
        expect(hasPermission).toBe(true);

        Platform.OS = 'android';
        request.mockReturnValue(Permissions.RESULTS.GRANTED);
        const permission = Permissions.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

        check.mockReturnValueOnce(Permissions.RESULTS.DENIED);
        hasPermission = await instance.hasStoragePermission();
        expect(check).toHaveBeenCalledWith(permission);
        expect(request).toHaveBeenCalled();
        expect(hasPermission).toBe(true);

        check.mockReturnValueOnce(Permissions.RESULTS.UNAVAILABLE);
        hasPermission = await instance.hasStoragePermission();
        expect(check).toHaveBeenCalledWith(permission);
        expect(request).toHaveBeenCalled();
        expect(hasPermission).toBe(true);
    });
});
