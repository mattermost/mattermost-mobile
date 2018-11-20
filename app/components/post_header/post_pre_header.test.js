// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import PostPreHeader from './post_pre_header';

describe('PostPreHeader', () => {
    const baseProps = {
        isConsecutive: false,
        isFlagged: false,
        isPinned: false,
        rightColumnStyle: [],
        skipFlaggedHeader: false,
        skipPinnedHeader: false,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot when not flagged or pinned post', () => {
        const wrapper = shallow(
            <PostPreHeader {...baseProps}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.type()).toBeNull();
    });

    test('should match snapshot when flagged post is set but skipFlaggedHeader is true', () => {
        const props = {
            ...baseProps,
            isFlagged: true,
            skipFlaggedHeader: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.type()).toBeNull();
    });

    test('should match snapshot when pinned post is set but skipPinnedHeader is true', () => {
        const props = {
            ...baseProps,
            isPinned: true,
            skipPinnedHeader: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.type()).toBeNull();
    });

    test('should match snapshot when flagged and not pinned', () => {
        const props = {
            ...baseProps,
            isFlagged: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#flagIcon').exists()).toEqual(true);
        expect(wrapper.find('#pinIcon').exists()).toEqual(false);
        expect(wrapper.find('FormattedText').first().props().id).toEqual('mobile.post_pre_header.flagged');
    });

    test('should match snapshot when pinned and not flagged', () => {
        const props = {
            ...baseProps,
            isPinned: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#flagIcon').exists()).toEqual(false);
        expect(wrapper.find('#pinIcon').exists()).toEqual(true);
        expect(wrapper.find('FormattedText').first().props().id).toEqual('mobile.post_pre_header.pinned');
    });

    test('should match snapshot when pinned and flagged', () => {
        const props = {
            ...baseProps,
            isFlagged: true,
            isPinned: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#flagIcon').exists()).toEqual(true);
        expect(wrapper.find('#pinIcon').exists()).toEqual(true);
        expect(wrapper.find('FormattedText').first().props().id).toEqual('mobile.post_pre_header.pinned_flagged');
    });

    test('should match snapshot when pinned and flagged but skipping pinned', () => {
        const props = {
            ...baseProps,
            isFlagged: true,
            isPinned: true,
            skipPinnedHeader: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#flagIcon').exists()).toEqual(true);
        expect(wrapper.find('#pinIcon').exists()).toEqual(false);
        expect(wrapper.find('FormattedText').first().props().id).toEqual('mobile.post_pre_header.flagged');
    });

    test('should match snapshot when pinned and flagged but skipping flagged', () => {
        const props = {
            ...baseProps,
            isFlagged: true,
            isPinned: true,
            skipFlaggedHeader: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#flagIcon').exists()).toEqual(false);
        expect(wrapper.find('#pinIcon').exists()).toEqual(true);
        expect(wrapper.find('FormattedText').first().props().id).toEqual('mobile.post_pre_header.pinned');
    });

    test('should match snapshot when pinned and flagged but skipping both', () => {
        const props = {
            ...baseProps,
            isFlagged: true,
            isPinned: true,
            skipFlaggedHeader: true,
            skipPinnedHeader: true,
        };

        const wrapper = shallow(
            <PostPreHeader {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.type()).toBeNull();
    });
});
