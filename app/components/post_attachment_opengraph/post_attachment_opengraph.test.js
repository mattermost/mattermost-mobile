// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import FastImage from 'react-native-fast-image';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import Preferences from '@mm-redux/constants/preferences';

import PostAttachmentOpenGraph from './post_attachment_opengraph';

describe('PostAttachmentOpenGraph', () => {
    const openGraphData = {
        site_name: 'Mattermost',
        title: 'Title',
        url: 'https://mattermost.com/',
        images: [{
            secure_url: 'https://www.mattermost.org/wp-content/uploads/2016/03/logoHorizontal_WS.png',
        }],
    };
    const baseProps = {
        actions: {
            getOpenGraphMetadata: jest.fn(),
        },
        deviceHeight: 600,
        deviceWidth: 400,
        imagesMetadata: {
            'https://www.mattermost.org/wp-content/uploads/2016/03/logoHorizontal_WS.png': {
                width: 1165,
                height: 265,
            },
        },
        isReplyPost: false,
        link: 'https://mattermost.com/',
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot, without image and description', () => {
        let wrapper = shallow(
            <PostAttachmentOpenGraph {...baseProps}/>,
        );

        // should return null
        expect(wrapper.getElement()).toMatchSnapshot();

        wrapper = shallow(
            <PostAttachmentOpenGraph
                {...baseProps}
                openGraphData={openGraphData}
            />,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(TouchableWithFeedback).exists()).toEqual(true);
    });

    test('should match snapshot, without site_name', () => {
        const newOpenGraphData = {
            title: 'Title',
            url: 'https://mattermost.com/',
        };
        const wrapper = shallow(
            <PostAttachmentOpenGraph
                {...baseProps}
                openGraphData={newOpenGraphData}
            />,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, without title and url', () => {
        const wrapper = shallow(
            <PostAttachmentOpenGraph
                {...baseProps}
                openGraphData={{}}
            />,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match state and snapshot, on renderImage', () => {
        let wrapper = shallow(
            <PostAttachmentOpenGraph {...baseProps}/>,
        );

        // should return null
        expect(wrapper.instance().renderImage()).toMatchSnapshot();
        expect(wrapper.state('hasImage')).toEqual(false);
        expect(wrapper.find(FastImage).exists()).toEqual(false);
        expect(wrapper.find(TouchableWithFeedback).exists()).toEqual(false);

        const images = [{height: 440, width: 1200, url: 'https://mattermost.com/logo.png'}];
        const openGraphDataWithImage = {...openGraphData, images};
        wrapper = shallow(
            <PostAttachmentOpenGraph
                {...baseProps}
                openGraphData={openGraphDataWithImage}
            />,
        );

        expect(wrapper.instance().renderImage()).toMatchSnapshot();
        expect(wrapper.state('hasImage')).toEqual(true);
        expect(wrapper.find(FastImage).exists()).toEqual(true);
        expect(wrapper.find(TouchableWithFeedback).exists()).toEqual(true);
    });

    test('should match state and snapshot, on renderDescription', () => {
        const wrapper = shallow(
            <PostAttachmentOpenGraph
                {...baseProps}
                openGraphData={openGraphData}
            />,
        );

        // should return null
        expect(wrapper.instance().renderDescription()).toMatchSnapshot();

        const openGraphDataWithDescription = {...openGraphData, description: 'Description'};
        wrapper.setProps({openGraphData: openGraphDataWithDescription});
        expect(wrapper.instance().renderDescription()).toMatchSnapshot();
    });

    test('should match result on getFilename', () => {
        const wrapper = shallow(
            <PostAttachmentOpenGraph {...baseProps}/>,
        );

        const testCases = [
            {link: 'https://mattermost.com/image.png', result: 'og-image.png'},
            {link: 'https://mattermost.com/image.jpg', result: 'og-image.jpg'},
            {link: 'https://mattermost.com/image', result: 'og-image.png'},
        ];

        testCases.forEach((testCase) => { // eslint-disable-line max-nested-callbacks
            expect(wrapper.instance().getFilename(testCase.link)).toEqual(testCase.result);
        });
    });
});
