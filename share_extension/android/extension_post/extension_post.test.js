// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert, PermissionsAndroid} from 'react-native';
import {shallowWithIntl} from 'test/intl-test-helper';

import ExtensionPost from './extension_post';

jest.spyOn(Alert, 'alert').mockReturnValue(true);
jest.spyOn(PermissionsAndroid, 'check').mockReturnValue(PermissionsAndroid.RESULTS.GRANTED);

jest.mock('react-navigation-stack/dist/views/TouchableItem', () => {});

jest.mock('NativeModules', () => ({
    MattermostShare: {
        close: jest.fn(),
    },
    RNKeychainManager: {
        SECURITY_LEVEL_ANY: 'ANY',
    },
}));

jest.mock('app/mattermost_managed', () => ({
    getConfig: jest.fn().mockReturnValue(false),
}));

const MAX_MESSAGE_LENGTH = 4000;

describe('ExtensionPost', () => {
    const baseProps = {
        actions: {
            getTeamChannels: jest.fn(),
        },
        channelId: 'channel-id',
        channels: {},
        currentUserId: 'current-user-id',
        maxFileSize: 1024,
        navigation: {
            setParams: jest.fn(),
        },
        teamId: 'team-id',
    };

    const wrapper = shallowWithIntl(
        <ExtensionPost {...baseProps}/>
    );

    const instance = wrapper.instance();

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
});
