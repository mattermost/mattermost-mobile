// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import DownloaderBottomContent from './downloader_bottom_content';

describe('DownloaderBottomContent', () => {
    const baseProps = {
        progressPercent: 10,
        isVideo: false,
        saveToCameraRoll: true,
    };

    test('should match snapshot for downloading', () => {
        const wrapper = shallow(
            <DownloaderBottomContent {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for downloaded file and isVideo', () => {
        const wrapper = shallow(
            <DownloaderBottomContent
                {...baseProps}
                isVideo={true}
                progressPercent={100}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for downloaded file and is not video', () => {
        const wrapper = shallow(
            <DownloaderBottomContent
                {...baseProps}
                progressPercent={100}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for downloaded file', () => {
        const wrapper = shallow(
            <DownloaderBottomContent
                {...baseProps}
                saveToCameraRoll={false}
                progressPercent={100}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
