// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from 'mattermost-redux/constants/preferences';

import PostBodyAdditionalContent from './post_body_additional_content';

describe('PostBodyAdditionalContent', () => {
    const baseProps = {
        actions: {
            getRedirectLocation: jest.fn(),
        },
        baseTextStyle: {color: '#dddddd'},
        blockStyles: {},
        deviceHeight: 500,
        deviceWidth: 400,
        isReplyPost: false,
        link: 'https://youtu.be/n_4CVqKOCm8',
        message: 'https://youtu.be/n_4CVqKOCm8',
        metadata: {
            embeds: [{
                type: 'opengraph',
                url: 'https://youtu.be/n_4CVqKOCm8',
            }],
            images: {
                'imageUrl.jpg': {
                    format: 'jpeg',
                    height: 480,
                    width: 360,
                },
            },
        },
        openGraphData: {
            images: [{
                height: 360,
                secure_url: 'secureUrl.jpg',
                width: 480,
            }],
            url: '',
        },
        onHashtagPress: jest.fn(),
        onPermalinkPress: jest.fn(),
        postProps: {},
        postId: '39956peq4bys9rugbdxd8sdudo',
        showLinkPreviews: true,
        theme: Preferences.THEMES.default,
    };

    test('Use opengraph data when metadata exists', () => {
        const wrapper = shallowWithIntl(
            <PostBodyAdditionalContent {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('Use default image when metadata does not exist', () => {
        const props = {...baseProps};
        Reflect.deleteProperty(props, 'metadata');
        const wrapper = shallowWithIntl(
            <PostBodyAdditionalContent {...props}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
