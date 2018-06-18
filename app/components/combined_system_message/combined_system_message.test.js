// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import {shallowWithIntl} from 'test/intl-test-helper';
import {emptyFunction} from 'app/utils/general';

import {Posts} from 'mattermost-redux/constants';

import CombinedSystemMessage from './combined_system_message';

/* eslint-disable max-nested-callbacks */

describe('CombinedSystemMessage', () => {
    const baseProps = {
        actions: {
            getProfilesByIds: emptyFunction,
            getProfilesByUsernames: emptyFunction,
        },
        allUserIds: ['user_id_1', 'user_id_2', 'user_id_3'],
        currentUserId: 'user_id_3',
        currentUsername: 'username_3',
        linkStyle: 1,
        messageData: [
            {postType: Posts.POST_TYPES.ADD_TO_TEAM, userIds: ['user_id_1'], actorId: 'user_id_2'},
        ],
        showJoinLeave: true,
        teammateNameDisplay: 'username',
        theme: {centerChannelColor: '#aaa'},
        userProfiles: [{id: 'user_id_1', username: 'user1'}, {id: 'user_id_2', username: 'user2'}, {id: 'user_id_3', username: 'user3'}],
    };

    test('should match snapshot', () => {
        const props = {
            ...baseProps,
            actions: {
                getProfilesByIds: jest.fn(),
                getProfilesByUsernames: emptyFunction,
            },
        };
        const wrapper = shallowWithIntl(
            <CombinedSystemMessage {...props}/>
        );

        const {postType, userIds, actorId} = baseProps.messageData[0];
        expect(wrapper.instance().renderSystemMessage(postType, userIds, actorId, {activityType: {fontSize: 14}, text: {opacity: 0.6}}, 1)).toMatchSnapshot();

        // on componentDidMount
        expect(props.actions.getProfilesByIds).toHaveBeenCalledTimes(1);
        expect(props.actions.getProfilesByIds).toHaveBeenCalledWith(props.allUserIds);
    });

    test('should match snapshot', () => {
        const localeFormat = {
            id: ['combined_system_message.first_user_and_second_user_were', 'combined_system_message.removed_from_team'],
            defaultMessage: ['{firstUser} and {secondUser} were ', 'removed from the team'],
        };
        const wrapper = shallowWithIntl(
            <CombinedSystemMessage {...baseProps}/>
        );

        expect(wrapper.instance().renderFormattedMessage(localeFormat, 'first_user', 'second_user', 'actor', {activityType: {fontSize: 14}, text: {opacity: 0.6}})).toMatchSnapshot();
    });

    test('should call getProfilesByIds and/or getProfilesByUsernames on loadUserProfiles', () => {
        const props = {
            ...baseProps,
            allUserIds: [],
            actions: {
                getProfilesByIds: jest.fn(),
                getProfilesByUsernames: jest.fn(),
            },
        };

        const wrapper = shallowWithIntl(
            <CombinedSystemMessage {...props}/>
        );

        wrapper.instance().loadUserProfiles([], []);
        expect(props.actions.getProfilesByIds).toHaveBeenCalledTimes(0);
        expect(props.actions.getProfilesByUsernames).toHaveBeenCalledTimes(0);

        wrapper.instance().loadUserProfiles(['user_id_1'], []);
        expect(props.actions.getProfilesByIds).toHaveBeenCalledTimes(1);
        expect(props.actions.getProfilesByIds).toHaveBeenCalledWith(['user_id_1']);
        expect(props.actions.getProfilesByUsernames).toHaveBeenCalledTimes(0);

        wrapper.instance().loadUserProfiles(['user_id_1', 'user_id_2'], ['user1']);
        expect(props.actions.getProfilesByIds).toHaveBeenCalledTimes(2);
        expect(props.actions.getProfilesByIds).toHaveBeenCalledWith(['user_id_1', 'user_id_2']);
        expect(props.actions.getProfilesByUsernames).toHaveBeenCalledTimes(1);
        expect(props.actions.getProfilesByUsernames).toHaveBeenCalledWith(['user1']);
    });
});
