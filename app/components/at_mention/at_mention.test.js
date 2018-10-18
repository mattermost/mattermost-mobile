// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {Clipboard, Platform} from 'react-native';

import mattermostManaged from 'app/mattermost_managed';

import Preferences from 'mattermost-redux/constants/preferences';

import AtMention from './at_mention';

jest.mock('react-intl');

describe('AtMention', () => {
    const baseProps = {
        isSearchResult: false,
        mentionName: 'user-1',
        mentionStyle: {color: '#2389d7'},
        navigator: {push: jest.fn(), showModal: jest.fn()},
        onLongPress: jest.fn(),
        onPostPress: jest.fn(),
        textStyle: {color: '#3d3c40', fontSize: 15, lineHeight: 20},
        teammateNameDisplay: 'username',
        theme: Preferences.THEMES.default,
        usersByUsername: {'user-1': {id: 'user-1', username: 'username_1'}},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <AtMention {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, for user without username', () => {
        const usersByUsername = {'user-1': {id: 'user-1'}};
        const wrapper = shallow(
            <AtMention
                {...baseProps}
                usersByUsername={usersByUsername}
            />
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, with suffix', () => {
        const usersByUsername = {'user-1': {id: 'user-1', username: 'user'}};
        const wrapper = shallow(
            <AtMention
                {...baseProps}
                usersByUsername={usersByUsername}
            />
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call Clipboard.setString on handleCopyMention', () => {
        Clipboard.setString = jest.fn();
        const wrapper = shallow(
            <AtMention {...baseProps}/>
        );

        const username = 'user-1';
        wrapper.setState({username});
        wrapper.instance().handleCopyMention();
        expect(Clipboard.setString).toHaveBeenCalledTimes(1);
        expect(Clipboard.setString).toBeCalledWith(`@${username}`);
    });

    test('should call props.onLongPress and mattermostManaged.getLocalConfig on handleLongPress', async () => {
        const translationId = {
            id: 'mobile.mention.copy_mention',
            defaultMessage: 'Copy Mention',
        };
        const formatMessage = jest.fn().mockReturnValue(translationId);
        mattermostManaged.getLocalConfig = jest.fn().
            mockResolvedValueOnce({copyAndPasteProtection: 'false'}).
            mockResolvedValue({copyAndPasteProtection: 'true'});
        const onLongPress = jest.fn();
        const wrapper = shallow(
            <AtMention
                {...baseProps}
                onLongPress={onLongPress}
            />, {context: {intl: {formatMessage}}},
        );

        wrapper.instance().handleCopyMention = jest.fn();

        // if not allowed to copy
        await wrapper.instance().handleLongPress();
        expect(mattermostManaged.getLocalConfig).toHaveBeenCalledTimes(1);
        expect(onLongPress).toHaveBeenCalledTimes(1);
        expect(onLongPress).lastCalledWith(undefined);

        // if allowed to copy
        const action = {text: translationId, onPress: wrapper.instance().handleCopyMention};
        await wrapper.instance().handleLongPress();
        expect(mattermostManaged.getLocalConfig).toHaveBeenCalledTimes(2);
        expect(onLongPress).toHaveBeenCalledTimes(2);
        expect(onLongPress).lastCalledWith(action);
    });

    test('should match return value on getUserDetailsFromMentionName', () => {
        const wrapper = shallow(
            <AtMention {...baseProps}/>
        );

        expect(wrapper.instance().getUserDetailsFromMentionName(baseProps)).toEqual({id: 'user-1', username: 'username_1'});
    });

    test('should call navigation on goToUserProfile', () => {
        const translationId = {
            id: 'mobile.routes.user_profile',
            defaultMessage: 'Profile',
        };
        const formatMessage = jest.fn().mockReturnValue(translationId);
        Platform.OS = 'ios';

        const wrapper = shallow(
            <AtMention {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        const options = {
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarBackgroundColor: '#1153ab',
                navBarButtonColor: '#ffffff',
                navBarTextColor: '#ffffff',
                screenBackgroundColor: '#ffffff',
            },
            passProps: {userId: 'user-1'},
            screen: 'UserProfile',
            title: {
                defaultMessage: 'Profile',
                id: 'mobile.routes.user_profile',
            },
        };

        wrapper.instance().goToUserProfile();
        expect(baseProps.navigator.push).toHaveBeenCalledTimes(1);
        expect(baseProps.navigator.push).toBeCalledWith(options);
        expect(baseProps.navigator.showModal).not.toBeCalled();

        Platform.OS = 'android';
        wrapper.instance().goToUserProfile();
        expect(baseProps.navigator.push).toHaveBeenCalledTimes(1);
        expect(baseProps.navigator.showModal).toHaveBeenCalledTimes(1);
        expect(baseProps.navigator.showModal).toBeCalledWith(options);
    });
});
