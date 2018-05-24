// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import {shallowWithIntl} from 'test/intl-test-helper';

import {Posts} from 'mattermost-redux/constants';

import CombinedSystemMessage from './combined_system_message';

describe('CombinedSystemMessage', () => {
    const baseProps = {
        actions: {
            getProfilesByIds: () => {}, // eslint-disable-line no-empty-function
        },
        allUserIds: ['user_id_1', 'user_id_2', 'user_id_3'],
        currentUserId: 'user_id_3',
        linkStyle: 1,
        messageData: [
            {postType: Posts.POST_TYPES.ADD_TO_TEAM, userIds: ['user_id_1'], actorId: 'user_id_2'},
        ],
        teammateNameDisplay: 'username',
        theme: {centerChannelColor: '#aaa'},
    };

    test('should match snapshot', () => {
        const props = {
            ...baseProps,
            actions: {getProfilesByIds: jest.fn(() => Promise.resolve({data: true}))},
        };
        const wrapper = shallowWithIntl(
            <CombinedSystemMessage {...props}/>
        );
        wrapper.setState({userProfiles: [{id: 'user_id_1', username: 'user1'}, {id: 'user_id_2', username: 'user2'}, {id: 'user_id_3', username: 'user3'}]});

        const {postType, userIds, actorId} = baseProps.messageData[0];
        expect(wrapper.instance().renderSystemMessage(postType, userIds, actorId, {activityType: {fontSize: 14}}, 1)).toMatchSnapshot();

        // on componentDidMount
        expect(props.actions.getProfilesByIds).toHaveBeenCalledTimes(1);
        expect(props.actions.getProfilesByIds).toHaveBeenCalledWith(props.allUserIds);
    });

    test('should match snapshot', () => {
        const props = {
            ...baseProps,
            actions: {getProfilesByIds: jest.fn(() => Promise.resolve({data: true}))},
        };
        const localeFormat = {
            id: ['combined_system_message.first_user_and_second_user_were', 'combined_system_message.removed_from_team'],
            defaultMessage: ['{firstUser} and {secondUser} were ', 'removed from the team'],
        };
        const wrapper = shallowWithIntl(
            <CombinedSystemMessage {...props}/>
        );

        wrapper.setState({userProfiles: [{id: 'user_id_1', username: 'user1'}, {id: 'user_id_2', username: 'user2'}, {id: 'user_id_3', username: 'user3'}]});
        expect(wrapper.instance().renderFormattedMessage(localeFormat, 'first_user', 'second_user', 'actor', {activityType: {fontSize: 14}})).toMatchSnapshot();
    });
});
