// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';
import {shallowWithIntl} from 'test/intl-test-helper';

import SavedPosts from './saved_posts';

describe('SavedPosts', () => {
    const baseProps = {
        actions: {
            clearSearch: jest.fn(),
            getPostThread: jest.fn(),
            getFlaggedPosts: jest.fn(),
            showPermalink: jest.fn(),
            selectPost: jest.fn(),
        },
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <SavedPosts {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when getFlaggedPosts failed', async () => {
        const error = new Error('foo');

        const newProps = {
            ...baseProps,
            actions: {
                ...baseProps.actions,
                getFlaggedPosts: jest.fn().mockResolvedValue({error}),
            },
        };
        const wrapper = shallowWithIntl(
            <SavedPosts {...newProps}/>,
        );

        await wrapper.instance().getFlaggedPosts();
        expect(wrapper.state('didFail')).toBe(true);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when component waiting for response', () => {
        const error = new Error('foo');

        const newProps = {
            ...baseProps,
            actions: {
                ...baseProps.actions,
                getFlaggedPosts: jest.fn().mockResolvedValue({error}),
            },
        };
        const wrapper = shallowWithIntl(
            <SavedPosts {...newProps}/>,
        );

        wrapper.instance().getFlaggedPosts();
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.state('isLoading')).toBe(true);
    });

    test('should call showSearchModal after awaiting dismissModal on handleHashtagPress', async () => {
        const error = new Error('foo');
        const dismissModal = jest.spyOn(NavigationActions, 'dismissModal');
        const showSearchModal = jest.spyOn(NavigationActions, 'showSearchModal');

        const hashtag = 'test';
        const wrapper = shallowWithIntl(
            <SavedPosts {...baseProps}/>,
        );

        dismissModal.mockImplementation(async () => {
            throw error;
        });
        let caughtError;
        try {
            await wrapper.instance().handleHashtagPress(hashtag);
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError).toBe(error);
        expect(dismissModal).toHaveBeenCalled();
        expect(showSearchModal).not.toHaveBeenCalled();

        dismissModal.mockImplementation(async () => (Promise.resolve()));
        await wrapper.instance().handleHashtagPress(hashtag);
        expect(dismissModal).toHaveBeenCalled();
        expect(showSearchModal).toHaveBeenCalledWith(`#${hashtag}`);
    });
});
