// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';
import PostList from './post_list';

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
        const showModalOverCurrentContext = jest.spyOn(NavigationActions, 'showModalOverCurrentContext');

        wrapper.setProps({deepLinkURL: deepLinks.permalink});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.selectFocusedPostId).toHaveBeenCalled();
        expect(showModalOverCurrentContext).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting channel deep link', () => {
        wrapper.setProps({deepLinkURL: deepLinks.channel});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.handleSelectChannelByName).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call flatListScrollToIndex only when ref is set and index is in range', () => {
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => cb());

        const instance = wrapper.instance();
        const flatListScrollToIndex = jest.spyOn(instance, 'flatListScrollToIndex');
        const indexInRange = baseProps.postIds.length;
        const indexOutOfRange = [-1, indexInRange + 1];

        instance.flatListRef = {
            current: null,
        };
        instance.scrollToIndex(indexInRange);
        expect(flatListScrollToIndex).not.toHaveBeenCalled();

        instance.flatListRef = {
            current: {
                scrollToIndex: jest.fn(),
            },
        };
        for (const index of indexOutOfRange) {
            instance.scrollToIndex(index);
            expect(flatListScrollToIndex).not.toHaveBeenCalled();
        }

        instance.scrollToIndex(indexInRange);
        expect(flatListScrollToIndex).toHaveBeenCalled();
    });
});
