// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import PostList from './post_list';
import Preferences from 'mattermost-redux/constants/preferences';

jest.useFakeTimers();

describe('PostList', () => {
    const serverURL = 'https://server-url.fake';
    const baseProps = {
        actions: {
            handleSelectChannelByName: jest.fn(),
            loadChannelsByTeamName: jest.fn(),
            refreshChannelWithRetry: jest.fn(),
            selectFocusedPostId: jest.fn(),
            setDeepLinkURL: jest.fn(),
        },
        deepLinkURL: '',
        navigator: {
            showModal: jest.fn(),
        },
        lastPostIndex: -1,
        postIds: ['post-id-1', 'post-id-2'],
        serverURL,
        siteURL: 'https://site-url.fake',
        theme: Preferences.THEMES.default,
    };

    const deepLinks = {
        permalink: serverURL + '/team-name/pl/pl-id',
        channel: serverURL + '/team-name/channels/channel-name',
    };

    const wrapper = shallow(
        <PostList {...baseProps}/>
    );

    test('should match snapshot', () => {
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting permalink deep link', () => {
        wrapper.setProps({deepLinkURL: deepLinks.permalink});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.selectFocusedPostId).toHaveBeenCalled();
        expect(baseProps.navigator.showModal).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting channel deep link', () => {
        wrapper.setProps({deepLinkURL: deepLinks.channel});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.handleSelectChannelByName).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
