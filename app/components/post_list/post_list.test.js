// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';
import PostList from './post_list';

jest.useFakeTimers();
jest.mock('react-intl');

describe('PostList', () => {
    const serverURL = 'https://server-url.fake';
    const deeplinkRoot = 'mattermost://server-url.fake';

    const baseProps = {
        actions: {
            selectChannelFromDeepLinkMatch: jest.fn(),
            getChannelsByTeamName: jest.fn(),
            refreshChannelWithRetry: jest.fn(),
            selectFocusedPostId: jest.fn(),
            setDeepLinkURL: jest.fn(),
        },
        channelId: 'channel-id',
        deepLinkURL: '',
        lastPostIndex: -1,
        postIds: ['post-id-1', 'post-id-2'],
        serverURL,
        siteURL: 'https://site-url.fake',
        theme: Preferences.THEMES.default,
    };

    const deepLinks = {
        permalink: deeplinkRoot + '/team-name/pl/pl-id',
        channel: deeplinkRoot + '/team-name/channels/channel-name',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting permalink deep link', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        const handlePermalinkPress = jest.spyOn(instance, 'handlePermalinkPress')

        wrapper.setProps({deepLinkURL: deepLinks.permalink});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(handlePermalinkPress).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('handlePermalinkPress calls props.onPermalinkPress set', async () => {
        const props = {
            ...baseProps,
            onPermalinkPress: jest.fn(),
        };
        const wrapper = shallow(
            <PostList {...props}/>,
        );
        const instance = wrapper.instance();

        await instance.handlePermalinkPress();
        expect(props.onPermalinkPress).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('handlePermalinkPress calls permalinkBadTeam when props.onPermalinkPress is not set and getChannelsByTeamName fails', async () => {
        const props = {
            ...baseProps,
            onPermalinkPress: null,
        };
        props.actions.getChannelsByTeamName.mockResolvedValue({error: true});

        const wrapper = shallow(
            <PostList {...props}/>,
        );
        const instance = wrapper.instance();
        instance.permalinkBadTeam = jest.fn();

        await instance.handlePermalinkPress();
        expect(instance.permalinkBadTeam).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('handlePermalinkPress calls showPermalinkView when props.onPermalinkPress is not set and getChannelsByTeamName succeeds', async () => {
        const props = {
            ...baseProps,
            onPermalinkPress: null,
        };
        props.actions.getChannelsByTeamName.mockResolvedValue({data: true});

        const wrapper = shallow(
            <PostList {...props}/>,
        );
        const instance = wrapper.instance();
        instance.showPermalinkView = jest.fn();

        await instance.handlePermalinkPress();
        expect(instance.showPermalinkView).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('showPermalinkView calls actions.selectFocuesPostId but doesn\'t open modal if permalink already showing', () => {
        const showModalOverCurrentContext = jest.spyOn(NavigationActions, 'showModalOverCurrentContext');
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.showingPermalink = true;

        instance.showPermalinkView();
        expect(baseProps.actions.selectFocusedPostId).toHaveBeenCalled();
        expect(showModalOverCurrentContext).not.toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('showPermalinkView calls actions.selectFocuesPostId and opens modal if permalink is not showing', () => {
        const showModalOverCurrentContext = jest.spyOn(NavigationActions, 'showModalOverCurrentContext');
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.showingPermalink = false;

        instance.showPermalinkView();
        expect(baseProps.actions.selectFocusedPostId).toHaveBeenCalled();
        expect(showModalOverCurrentContext).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting channel deep link', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );

        wrapper.setProps({deepLinkURL: deepLinks.channel});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.selectChannelFromDeepLinkMatch).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call flatListScrollToIndex only when ref is set and index is in range', () => {
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => cb());

        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
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

    test('should load more posts if available space on the screen', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.loadToFillContent = jest.fn();

        wrapper.setProps({
            extraData: false,
        });
        expect(instance.loadToFillContent).toHaveBeenCalledTimes(0);

        instance.postListHeight = 500;
        instance.contentHeight = 200;
        wrapper.setProps({
            extraData: true,
        });

        expect(instance.loadToFillContent).toHaveBeenCalledTimes(1);
    });
});
