// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';
import {TouchableOpacity} from 'react-native';

import Preferences from '@mm-redux/constants/preferences';

import CurrentCall from './current_call';

describe('CurrentCall', () => {
    const baseProps = {
        actions: {
            muteMyself: jest.fn(),
            unmuteMyself: jest.fn(),
        },
        theme: Preferences.THEMES.denim,
        channel: {
            display_name: 'Channel Name',
        },
        speaker: {
            id: 'user-1-id',
            muted: false,
            isTalking: true,
        },
        speakerUser: {
            id: 'user-1-id',
            username: 'user-1-username',
            nickname: 'User 1',
        },
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
        currentParticipant: {
            id: 'user-2-id',
            muted: true,
            isTalking: true,
        },
        teammateNameDisplay: Preferences.DISPLAY_PREFER_NICKNAME,
    };

    test('should match snapshot muted', () => {
        const props = {...baseProps, currentParticipant: {...baseProps.currentParticipant, muted: true}};
        const wrapper = shallow(<CurrentCall {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot unmuted', () => {
        const props = {...baseProps, currentParticipant: {...baseProps.currentParticipant, muted: false}};
        const wrapper = shallow(<CurrentCall {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should mute on click mute button', () => {
        const muteMyself = jest.fn();
        const unmuteMyself = jest.fn();
        const props = {...baseProps, actions: {muteMyself, unmuteMyself}, currentParticipant: {...baseProps.currentParticipant, muted: false}};
        const wrapper = shallow(<CurrentCall {...props}/>);

        wrapper.find(TouchableOpacity).simulate('press');
        expect(props.actions.muteMyself).toHaveBeenCalled();
        expect(props.actions.unmuteMyself).not.toHaveBeenCalled();
    });

    test('should ask for confirmation on click', () => {
        const muteMyself = jest.fn();
        const unmuteMyself = jest.fn();
        const props = {...baseProps, actions: {unmuteMyself, muteMyself}, currentParticipant: {...baseProps.currentParticipant, muted: true}};
        const wrapper = shallow(<CurrentCall {...props}/>);

        wrapper.find(TouchableOpacity).simulate('press');
        expect(props.actions.muteMyself).not.toHaveBeenCalled();
        expect(props.actions.unmuteMyself).toHaveBeenCalled();
    });
});
