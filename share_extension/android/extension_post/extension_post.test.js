// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert, PermissionsAndroid} from 'react-native';
import {shallowWithIntl} from 'test/intl-test-helper';

import ExtensionPost from './extension_post';

jest.spyOn(Alert, 'alert').mockReturnValue(true);
jest.spyOn(PermissionsAndroid, 'check').mockReturnValue(PermissionsAndroid.RESULTS.GRANTED);

jest.mock('@react-navigation/stack/lib/module/views/TouchableItem', () => null);

jest.mock('app/mattermost_managed', () => ({
    getConfig: jest.fn().mockReturnValue(false),
}));

const MAX_MESSAGE_LENGTH = 4000;

describe('ExtensionPost', () => {
    const baseProps = {
        channelId: 'channel-id',
        channels: {},
        currentUserId: 'current-user-id',
        getTeamChannels: jest.fn(),
        canUploadFiles: true,
        maxFileSize: 1024,
        navigation: {
            setOptions: jest.fn(),
        },
        route: {
            params: {},
        },
        teamId: 'team-id',
    };

    const wrapper = shallowWithIntl(
        <ExtensionPost {...baseProps}/>,
    );

    const instance = wrapper.instance();
    instance.renderErrorMessage = jest.fn();

    const postMessage = (message) => {
        wrapper.setState({value: message});
        instance.onPost();
    };

    test('should show Alert dialog if shared message is longer than maximum length permitted', () => {
        const longMessage = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
        postMessage(longMessage);

        expect(Alert.alert).toHaveBeenCalledTimes(1);
    });

    test('should not show Alert dialog if shared message is within maximum length permitted', () => {
        const message = 'a'.repeat(MAX_MESSAGE_LENGTH - 1);
        postMessage(message);

        expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should not show Alert dialog if shared message is at maximum length permitted', () => {
        const exactLengthMessage = 'a'.repeat(MAX_MESSAGE_LENGTH);
        postMessage(exactLengthMessage);

        expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should render file uploads disabled message when canUploadFiles is false', () => {
        wrapper.setState({loaded: true});
        wrapper.setProps({canUploadFiles: false});
        expect(instance.renderErrorMessage).toHaveBeenCalledWith('File uploads from mobile are disabled. Please contact your System Admin for more details.');
    });
});
