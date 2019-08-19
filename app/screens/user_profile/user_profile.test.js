// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import UserProfile from './user_profile.js';
import BotTag from 'app/components/bot_tag';
import GuestTag from 'app/components/guest_tag';

jest.mock('react-intl');
jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('user_profile', () => {
    const actions = {
        setChannelDisplayName: jest.fn(),
        makeDirectChannel: jest.fn(),
        loadBot: jest.fn(),
        setButtons: jest.fn(),
        dismissModal: jest.fn(),
        goToScreen: jest.fn(),
        dismissAllModals: jest.fn(),
        popToRoot: jest.fn(),
    };
    const baseProps = {
        actions,
        config: {
            ShowEmailAddress: true,
        },
        teammateNameDisplay: 'username',
        teams: [],
        theme: Preferences.THEMES.default,
        enableTimezone: false,
        militaryTime: false,
        isMyUser: false,
        componentId: 'component-id',
        isLandscape: false,
    };

    const user = {
        email: 'test@test.com',
        first_name: 'test',
        id: '4hzdnk6mg7gepe7yze6m3domnc',
        last_name: 'fake',
        nickname: 'nick',
        username: 'fred',
        is_bot: false,
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should contain bot tag', async () => {
        const botUser = {
            email: 'test@test.com',
            first_name: 'test',
            id: '4hzdnk6mg7gepe7yze6m3domnc',
            last_name: 'fake',
            nickname: 'nick',
            username: 'fred',
            is_bot: true,
        };

        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={botUser}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.containsMatchingElement(
            <BotTag
                show={true}
                theme={baseProps.theme}
            />
        )).toEqual(true);
    });

    test('should contain guest tag', async () => {
        const guestUser = {
            email: 'test@test.com',
            first_name: 'test',
            id: '4hzdnk6mg7gepe7yze6m3domnc',
            last_name: 'fake',
            nickname: 'nick',
            username: 'fred',
            roles: 'system_guest',
        };

        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={guestUser}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.containsMatchingElement(
            <GuestTag
                show={true}
                theme={baseProps.theme}
            />
        )).toEqual(true);
    });

    test('should push EditProfile', async () => {
        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().goToEditProfile();
        setTimeout(() => {
            expect(baseProps.actions.goToScreen).toHaveBeenCalledTimes(1);
        }, 16);
    });

    test('should call goToEditProfile', () => {
        const props = {
            ...baseProps,
            actions: {
                ...baseProps.actions,
                goToScreen: jest.fn(),
            },
        };
        const wrapper = shallow(
            <UserProfile
                {...props}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        const event = {buttonId: wrapper.instance().rightButton.id};
        wrapper.instance().navigationButtonPressed(event);
        setTimeout(() => {
            expect(baseProps.actions.goToScreen).toHaveBeenCalledTimes(1);
        }, 0);
    });

    test('should close', async () => {
        const props = {...baseProps, fromSettings: true};

        const wrapper = shallow(
            <UserProfile
                {...props}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        const event = {buttonId: 'close-settings'};
        wrapper.instance().navigationButtonPressed(event);
        expect(props.actions.dismissModal).toHaveBeenCalledTimes(1);

        props.fromSettings = false;
        wrapper.setProps({...props});
        wrapper.instance().navigationButtonPressed(event);
        expect(props.actions.dismissAllModals).toHaveBeenCalledTimes(1);
        expect(props.actions.popToRoot).toHaveBeenCalledTimes(1);
        expect(props.actions.popToRoot).toHaveBeenCalledWith(props.componentId);
    });
});
