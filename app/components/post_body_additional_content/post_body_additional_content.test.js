// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@mm-redux/constants';

import {shallowWithIntl} from 'test/intl-test-helper';

import * as Utils from '@utils/url';
import PostBodyAdditionalContent from './post_body_additional_content.js';

describe('PostBodyAdditionalContent', () => {
    const baseProps = {
        actions: {
            getRedirectLocation: jest.fn(),
        },
        link: 'http://short.ened/123',
        deviceHeight: 100,
        deviceWidth: 100,
        message: 'message',
        postId: 'post-id',
        postProps: {},
        showLinkPreviews: false,
        theme: Preferences.THEMES.default,
    };

    test('should call getRedirectLocation only if expandedLink has not been set', () => {
        const wrapper = shallowWithIntl(<PostBodyAdditionalContent {...baseProps}/>);
        const instance = wrapper.instance();

        expect(baseProps.actions.getRedirectLocation).toHaveBeenCalledTimes(1);

        wrapper.setProps({expandedLink: 'http://expanded.com/123'});
        instance.load();
        expect(baseProps.actions.getRedirectLocation).toHaveBeenCalledTimes(1);
    });

    test('should call getRedirectLocation if expandedLink is set but link changed', () => {
        const props = {
            ...baseProps,
            expandedLink: 'http://expanded.com/123',
        };
        const wrapper = shallowWithIntl(<PostBodyAdditionalContent {...props}/>);
        const instance = wrapper.instance();

        expect(baseProps.actions.getRedirectLocation).toHaveBeenCalledTimes(0);

        wrapper.setProps({link: `${baseProps.link}/456`});
        instance.load();
        expect(baseProps.actions.getRedirectLocation).toHaveBeenCalledTimes(1);
    });

    test('getImageUrl should return passed URL if content is an image', () => {
        const wrapper = shallowWithIntl(<PostBodyAdditionalContent {...baseProps}/>);
        const instance = wrapper.instance();
        instance.isImage = jest.fn().mockReturnValueOnce(true);

        const url = 'https://test.url';
        const imageUrl = instance.getImageUrl(url);
        expect(imageUrl).toEqual(url);
    });

    test('getImageUrl should return first metadata image URL if content is a YouTube link', () => {
        const url1 = 'https://test.url1';
        const url2 = 'https://test.url2';
        const props = {
            ...baseProps,
            metadata: {
                images: {
                    [url1]: 'URL 1',
                    [url2]: 'URL 2',
                },
            },
        };
        const wrapper = shallowWithIntl(<PostBodyAdditionalContent {...props}/>);
        const instance = wrapper.instance();
        instance.isImage = jest.fn().mockReturnValueOnce(false);
        Utils.isYoutubeLink = jest.fn().mockReturnValueOnce(true); // eslint-disable-line no-import-assign

        const imageUrl = instance.getImageUrl();
        expect(imageUrl).toEqual(url1);
    });

    test('getImageUrl should return default URL if content is a YouTube link and there is no image metadata', () => {
        const wrapper = shallowWithIntl(<PostBodyAdditionalContent {...baseProps}/>);
        const instance = wrapper.instance();
        instance.isImage = jest.fn().mockReturnValueOnce(false);
        Utils.isYoutubeLink = jest.fn().mockReturnValueOnce(true); // eslint-disable-line no-import-assign
        Utils.getYouTubeVideoId = jest.fn().mockReturnValueOnce('videoId'); // eslint-disable-line no-import-assign

        const imageUrl = instance.getImageUrl();
        expect(imageUrl).toEqual('https://i.ytimg.com/vi/videoId/hqdefault.jpg');
    });

    test('getImageUrl should return undefined if content is not an image nor a YouTube link', () => {
        const wrapper = shallowWithIntl(<PostBodyAdditionalContent {...baseProps}/>);
        const instance = wrapper.instance();
        instance.isImage = jest.fn().mockReturnValueOnce(false);
        Utils.isYoutubeLink = jest.fn().mockReturnValueOnce(false); // eslint-disable-line no-import-assign

        const imageUrl = instance.getImageUrl();
        expect(imageUrl).toBeUndefined();
    });
});
