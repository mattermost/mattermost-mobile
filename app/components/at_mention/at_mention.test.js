// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {Clipboard, Platform, Text} from 'react-native';

import mattermostManaged from 'app/mattermost_managed';

import {General} from 'mattermost-redux/constants';
import Preferences from 'mattermost-redux/constants/preferences';

import AtMention from './at_mention';

jest.mock('react-intl');

describe('AtMention', () => {
    const baseProps = {
        isSearchResult: false,
        mentionName: 'username-1',
        mentionStyle: {color: '#2389d7'},
        navigator: {push: jest.fn(), showModal: jest.fn()},
        onLongPress: jest.fn(),
        onPostPress: jest.fn(),
        textStyle: {color: '#3d3c40', fontSize: 15, lineHeight: 20},
        teammateNameDisplay: General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME,
        theme: Preferences.THEMES.default,
        usersByUsername: {'username-1': {id: 'user_id_1', username: 'username-1'}},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <AtMention {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(Text).length).toBe(2);

        const outerText = wrapper.find(Text).first();
        expect(outerText.props().onLongPress).toBeDefined();
        expect(outerText.props().onPress).toBeDefined();

        // inner text with highlight
        const innerText = wrapper.find(Text).last();
        expect(innerText.props().style.color).toBe('#2389d7');

        expect(innerText.props().children).toContain(baseProps.mentionName);
    });

    test('should match text if mentioned name is not found on user profiles', () => {
        const usersByUsername = {'user-2': {id: 'user_id_2', username: 'user-2'}};
        const wrapper = shallow(
            <AtMention
                {...baseProps}
                usersByUsername={usersByUsername}
            />
        );

        expect(wrapper.find(Text).length).toBe(1);

        const outerText = wrapper.find(Text).first();
        expect(outerText.props().onLongPress).not.toBeDefined();
        expect(outerText.props().onPress).not.toBeDefined();
        expect(outerText.props().children).toContain(baseProps.mentionName);
    });

    test('should match text if mentioned name is with trailing punctuation', () => {
        const mentionName = 'username-1.';
        const wrapper = shallow(
            <AtMention
                {...baseProps}
                mentionName={mentionName}
            />
        );

        expect(wrapper.find(Text).length).toBe(2);

        const outerText = wrapper.find(Text).first();
        const innerText = wrapper.find(Text).last();
        expect(outerText.props().children).toContain('.');
        expect(innerText.props().children).toContain(baseProps.mentionName);
    });

    test('should match snapshot, mention name on full_name', () => {
        const usersByUsername = {
            'username-1': {
                id: 'user_id_1',
                username: 'username-1',
                first_name: 'Firstname',
                last_name: 'Lastname',
            },
        };
        const teammateNameDisplay = General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME;
        const wrapper = shallow(
            <AtMention
                {...baseProps}
                teammateNameDisplay={teammateNameDisplay}
                usersByUsername={usersByUsername}
            />
        );

        expect(wrapper.find(Text).length).toBe(2);

        const innerText = wrapper.find(Text).last();
        expect(innerText.props().children).toContain('@Firstname Lastname');
    });

    test('should call Clipboard.setString on handleCopyMention', () => {
        Clipboard.setString = jest.fn();
        const wrapper = shallow(
            <AtMention {...baseProps}/>
        );

        const username = 'username-1';
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

    describe('should match return value on getUserDetailsFromMentionName', () => {
        const wrapper = shallow(
            <AtMention {...baseProps}/>
        );

        const user1 = {id: 'user_id_1', username: 'username-1'};
        const user2 = {id: 'user_id_2', username: 'username-2'};

        const testCases = [
            {
                name: 'regular mention',
                input: {mentionName: 'username-1', usersByUsername: {[user1.username]: user1}},
                output: user1,
            },
            {
                name: 'another mention',
                input: {mentionName: 'username-2', usersByUsername: {[user1.username]: user1, [user2.username]: user2}},
                output: user2,
            },
            {
                name: 'mention name with trailing punctuation',
                input: {mentionName: 'username-1.', usersByUsername: {[user1.username]: user1, [user2.username]: user2}},
                output: user1,
            },
            {
                name: 'mention name with trailing punctuations',
                input: {mentionName: 'username-1.-_', usersByUsername: {[user1.username]: user1, [user2.username]: user2}},
                output: user1,
            },
            {
                name: 'mention name not found in usersByUsername',
                input: {mentionName: 'othername', usersByUsername: {[user1.username]: user1, [user2.username]: user2}},
                output: {username: ''},
            },
        ];

        for (const testCase of testCases) {
            const {name, input, output} = testCase;
            test(name, () => {
                expect(wrapper.instance().getUserDetailsFromMentionName(input.mentionName, input.usersByUsername)).toEqual(output);
            });
        }
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
            passProps: {userId: 'user_id_1'},
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
