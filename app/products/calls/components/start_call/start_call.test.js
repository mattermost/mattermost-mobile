// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert, TouchableHighlight} from 'react-native';

import Preferences from '@mm-redux/constants/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import {shallowWithIntl} from '@test/intl-test-helper';

import StartCall from './start_call';

describe('StartCall', () => {
    const baseProps = {
        actions: {
            joinCall: jest.fn(),
        },
        testID: 'test-id',
        theme: Preferences.THEMES.denim,
        currentChannelId: 'channel-id',
        currentChannelName: 'Channel Name',
        canStartCall: true,
        callChannelName: 'Call channel name',
        confirmToJoin: false,
        alreadyInTheCall: false,
        ongoingCall: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<StartCall {...baseProps}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when there is already an ongoing call in the channel', () => {
        const props = {...baseProps, ongoingCall: true};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should be null when you are already in the channel call', () => {
        const props = {...baseProps, alreadyInTheCall: true};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        expect(wrapper.getElement()).toBeNull();
    });

    test('should be null if you can not start a call', () => {
        const props = {...baseProps, canStartCall: false};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        expect(wrapper.getElement()).toBeNull();
    });

    test('should join on click', () => {
        const joinCall = jest.fn();
        const props = {...baseProps, actions: {joinCall}};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        wrapper.find(ChannelInfoRow).dive().find(TouchableHighlight).simulate('press');
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(props.actions.joinCall).toHaveBeenCalled();
    });

    test('should ask for confirmation on click', () => {
        const joinCall = jest.fn();
        const props = {...baseProps, confirmToJoin: true, actions: {joinCall}};
        const wrapper = shallowWithIntl(<StartCall {...props}/>).dive();

        wrapper.find(ChannelInfoRow).dive().find(TouchableHighlight).simulate('press');
        expect(Alert.alert).toHaveBeenCalled();
        expect(props.actions.joinCall).not.toHaveBeenCalled();
    });
});
