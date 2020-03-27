// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@mm-redux/constants';

import {shallowWithIntl} from 'test/intl-test-helper';

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
});
