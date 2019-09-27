// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';

import UserProfile from './user_profile.js';
import {BotTag, GuestTag} from 'app/components/tag';

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

    test('should match snapshot', () => {
        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should contain bot tag', () => {
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

    test('should contain guest tag', () => {
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

    test('should push EditProfile', () => {
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => cb());
        const goToScreen = jest.spyOn(NavigationActions, 'goToScreen');

        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().goToEditProfile();
        expect(goToScreen).toHaveBeenCalledTimes(1);
    });

    test('should call goToEditProfile', () => {
        const goToScreen = jest.spyOn(NavigationActions, 'goToScreen');

        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        const event = {buttonId: wrapper.instance().rightButton.id};
        wrapper.instance().navigationButtonPressed(event);
        expect(goToScreen).toHaveBeenCalledTimes(1);
    });

    test('close should dismiss modal when fromSettings is true', async () => {
        const dismissModal = jest.spyOn(NavigationActions, 'dismissModal');
        const dismissAllModals = jest.spyOn(NavigationActions, 'dismissAllModals');
        const popToRoot = jest.spyOn(NavigationActions, 'popToRoot');

        const props = {...baseProps, fromSettings: true};

        const wrapper = shallow(
            <UserProfile
                {...props}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        await wrapper.instance().close();
        expect(dismissModal).toHaveBeenCalledTimes(1);
        expect(dismissAllModals).toHaveBeenCalledTimes(0);
        expect(popToRoot).toHaveBeenCalledTimes(0);
    });

    test('close should dismiss all modals and pop to root when fromSettings is false', async () => {
        const dismissModal = jest.spyOn(NavigationActions, 'dismissModal');
        const dismissAllModals = jest.spyOn(NavigationActions, 'dismissAllModals');
        const popToRoot = jest.spyOn(NavigationActions, 'popToRoot');

        const props = {...baseProps, fromSettings: false};

        const wrapper = shallow(
            <UserProfile
                {...props}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        await wrapper.instance().close();
        expect(dismissModal).toHaveBeenCalledTimes(0);
        expect(dismissAllModals).toHaveBeenCalledTimes(1);
        expect(popToRoot).toHaveBeenCalledTimes(1);
    });

    test('should call close', () => {
        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        const close = jest.spyOn(wrapper.instance(), 'close');
        const event = {buttonId: 'close-settings'};
        wrapper.instance().navigationButtonPressed(event);
        expect(close).toHaveBeenCalledTimes(1);
    });
});
