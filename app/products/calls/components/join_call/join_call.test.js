// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';

import Preferences from '@mm-redux/constants/preferences';
import {shallowWithIntl} from '@test/intl-test-helper';

import JoinCall from './join_call';

describe('JoinCall', () => {
    const baseProps = {
        actions: {
            joinCall: jest.fn(),
        },
        theme: Preferences.THEMES.denim,
        call: {
            participants: {
                'user-1-id': {
                    id: 'user-1-id',
                    muted: false,
                    isTalking: false,
                },
                'user-2-id': {
                    id: 'user-2-id',
                    muted: true,
                    isTalking: true,
                },
            },
            channelId: 'channel-id',
            startTime: 100,
            speakers: 'user-2-id',
            screenOn: false,
            threadId: false,
        },
        confirmToJoin: false,
        alreadyInTheCall: false,
        currentChannelName: 'Current Channel',
        callChannelName: 'Call Channel',
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<JoinCall {...baseProps}/>).dive();

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should not show it when I am already in the call', () => {
        const props = {...baseProps, alreadyInTheCall: true};
        const wrapper = shallowWithIntl(<JoinCall {...props}/>).dive();

        expect(wrapper.getElement()).toBeNull();
    });

    test('should join on click', () => {
        const joinCall = jest.fn();
        const props = {...baseProps, actions: {joinCall}};
        const wrapper = shallowWithIntl(<JoinCall {...props}/>).dive();

        wrapper.simulate('press');
        expect(Alert.alert).not.toHaveBeenCalled();
        expect(props.actions.joinCall).toHaveBeenCalled();
    });

    test('should ask for confirmation on click', () => {
        const joinCall = jest.fn();
        const props = {...baseProps, confirmToJoin: true, actions: {joinCall}};
        const wrapper = shallowWithIntl(<JoinCall {...props}/>).dive();

        wrapper.simulate('press');
        expect(Alert.alert).toHaveBeenCalled();
        expect(props.actions.joinCall).not.toHaveBeenCalled();
    });
});
