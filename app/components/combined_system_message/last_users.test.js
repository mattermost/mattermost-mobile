// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import {Posts} from 'mattermost-redux/constants';

import {shallowWithIntl} from 'test/intl-test-helper';

import LastUsers from './last_users';

describe('LastUsers', () => {
    const baseProps = {
        actor: 'actor',
        expandedLocale: {id: 'expanded_locale_id', defaultMessage: 'Expanded Locale'},
        navigator: {},
        postType: Posts.POST_TYPES.ADD_TO_TEAM,
        style: {activityType: {fontSize: 14}, link: 1, text: {opacity: 0.6}},
        textStyles: {},
        usernames: ['username_1', 'username_2'],
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <LastUsers {...baseProps}/>
        );

        const expanded = wrapper.instance().renderExpandedView(baseProps.expandedLocale, baseProps.userDisplayNames, baseProps.actor, 1, baseProps.style);
        expect(expanded).toMatchSnapshot();

        const collapsed = wrapper.instance().renderCollapsedView(baseProps.postType, baseProps.userDisplayNames, baseProps.actor, 1, baseProps.style);
        expect(collapsed).toMatchSnapshot();
    });

    test('should match state on handleOnPress', () => {
        const wrapper = shallowWithIntl(
            <LastUsers {...baseProps}/>
        );

        wrapper.setState({expand: false});
        wrapper.instance().handleOnPress({preventDefault: jest.fn()});
        expect(wrapper.state('expand')).toEqual(true);
    });
});
