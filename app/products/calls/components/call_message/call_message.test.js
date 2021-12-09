// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert, TouchableOpacity} from 'react-native';

import Preferences from '@mm-redux/constants/preferences';
import {shallowWithIntl} from '@test/intl-test-helper';

import CallMessage from './call_message';

describe('CallMessage', () => {
    const baseProps = {
        actions: {
            joinCall: jest.fn(),
        },
        theme: Preferences.THEMES.denim,
        post: {
            props: {
                start_at: 100,
            },
            type: 'custom_calls',
        },
        user: {
            id: 'user-1-id',
            username: 'user-1-username',
            nickname: 'User 1',
        },
        teammateNameDisplay: Preferences.DISPLAY_PREFER_NICKNAME,
        confirmToJoin: false,
        isMilitaryTime: false,
        userTimezone: 'utc',
        currentChannelName: 'Current Channel',
        callChannelName: 'Call Channel',
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<CallMessage {...baseProps}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for the call already in the current channel', () => {
        const props = {...baseProps, alreadyInTheCall: true};
        const wrapper = shallowWithIntl(<CallMessage {...props}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for ended call', () => {
        const props = {...baseProps, post: {...baseProps.post, props: {start_at: 100, end_at: 200}}};
        const wrapper = shallowWithIntl(<CallMessage {...props}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should join on click join button', () => {
        const joinCall = jest.fn();
        const props = {...baseProps, actions: {joinCall}};
        const wrapper = shallowWithIntl(<CallMessage {...props}/>).dive();

        wrapper.find(TouchableOpacity).simulate('press');
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(props.actions.joinCall).toHaveBeenCalled();
    });

    test('should ask for confirmation on click join button', () => {
        const joinCall = jest.fn();
        const props = {...baseProps, confirmToJoin: true, actions: {joinCall}};
        const wrapper = shallowWithIntl(<CallMessage {...props}/>).dive();

        wrapper.find(TouchableOpacity).simulate('press');
        expect(Alert.alert).toHaveBeenCalled();
        expect(props.actions.joinCall).not.toHaveBeenCalled();
    });

    test('should not ask or join on click current call button if I am in the current call', () => {
        const joinCall = jest.fn();
        const props = {...baseProps, actions: {joinCall}, alreadyInTheCall: true};
        const wrapper = shallowWithIntl(<CallMessage {...props}/>).dive();

        wrapper.find(TouchableOpacity).simulate('press');
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(props.actions.joinCall).not.toHaveBeenCalled();
    });
});
