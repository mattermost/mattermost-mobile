// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import CallScreen from './call_screen';

describe('CallScreen', () => {
    const baseProps = {
        actions: {
            muteMyself: jest.fn(),
            unmuteMyself: jest.fn(),
            leaveCall: jest.fn(),
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
        users: {
            'user-1-id': {
                id: 'user-1-id',
                username: 'user-1-username',
                nickname: 'User 1',
            },
            'user-2-id': {
                id: 'user-2-id',
                username: 'user-2-username',
                nickname: 'User 2',
            },
        },
        currentParticipant: {
            id: 'user-2-id',
            muted: true,
            isTalking: true,
        },
        teammateNameDisplay: Preferences.DISPLAY_PREFER_NICKNAME,
        screenShareURL: '',
    };

    beforeEach(() => {
        jest.doMock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
            default: jest.fn().mockReturnValue({width: 800, height: 400}),
        }));
    });

    afterEach(() => {
        jest.resetModules();
    });

    test('should show controls in landscape view on click the users list', () => {
        const props = {...baseProps, call: {...baseProps.call, screenOn: false}};
        const wrapper = shallow(<CallScreen {...props}/>);
        wrapper.find({testID: 'users-list'}).simulate('press');
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should show controls in landscape view on click the screen share', () => {
        const props = {...baseProps, call: {...baseProps.call, screenOn: true}, screenShareURL: 'screen-share-url'};
        const wrapper = shallow(<CallScreen {...props}/>);
        wrapper.find({testID: 'screen-share-container'}).simulate('press');
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    ['Portrait', 'Landscape'].forEach((orientation) => {
        describe(orientation, () => {
            beforeEach(() => {
                if (orientation === 'Landscape') {
                    jest.doMock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
                        default: jest.fn().mockReturnValue({width: 800, height: 400}),
                    }));
                } else {
                    jest.doMock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
                        default: jest.fn().mockReturnValue({width: 400, height: 800}),
                    }));
                }
            });

            afterEach(() => {
                jest.resetModules();
            });

            test('should match snapshot', () => {
                const wrapper = shallow(<CallScreen {...baseProps}/>);

                expect(wrapper.getElement()).toMatchSnapshot();
            });

            test('should match snapshot with screenshare', () => {
                const props = {...baseProps, call: {...baseProps.call, screenOn: true}, screenShareURL: 'screen-share-url'};
                const wrapper = shallow(<CallScreen {...props}/>);

                expect(wrapper.getElement()).toMatchSnapshot();
            });

            test('should leave on click leave button', () => {
                const leaveCall = jest.fn();
                const props = {...baseProps, actions: {...baseProps.actions, leaveCall}};
                const wrapper = shallow(<CallScreen {...props}/>);

                wrapper.find({testID: 'leave'}).simulate('press');
                expect(props.actions.leaveCall).toHaveBeenCalled();
            });

            test('should mute myself on click mute/unmute button if i am not muted', () => {
                const muteMyself = jest.fn();
                const unmuteMyself = jest.fn();
                const props = {
                    ...baseProps,
                    actions: {
                        ...baseProps.actions,
                        muteMyself,
                        unmuteMyself,
                    },
                    currentParticipant: {
                        ...baseProps.currentParticipant,
                        muted: false,
                    },
                };
                const wrapper = shallow(<CallScreen {...props}/>);

                wrapper.find({testID: 'mute-unmute'}).simulate('press');
                expect(props.actions.muteMyself).toHaveBeenCalled();
                expect(props.actions.unmuteMyself).not.toHaveBeenCalled();
            });

            test('should mute myself on click mute/unmute button if i am muted', () => {
                const muteMyself = jest.fn();
                const unmuteMyself = jest.fn();
                const props = {
                    ...baseProps,
                    actions: {
                        ...baseProps.actions,
                        muteMyself,
                        unmuteMyself,
                    },
                    currentParticipant: {
                        ...baseProps.currentParticipant,
                        muted: true,
                    },
                };
                const wrapper = shallow(<CallScreen {...props}/>);

                wrapper.find({testID: 'mute-unmute'}).simulate('press');
                expect(props.actions.muteMyself).not.toHaveBeenCalled();
                expect(props.actions.unmuteMyself).toHaveBeenCalled();
            });
        });
    });
});
