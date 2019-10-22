// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import ProgressiveImage from './progressive_image';

describe('ProgressiveImage', () => {
    const baseProps = {
        isBackgroundImage: false,
        defaultSource: 0,
        filename: 'defaultImage',
        imageUri: 'https://images.com/image.png',
        onError: jest.fn(),
        resizeMethod: 'auto',
        resizeMode: 'contain',
        theme: Preferences.THEMES.default,
        thumbnailUri: 'https://images.com/image.png',
        tintDefaultSource: false,
    };

    test('should match snapshot when just a image loads', () => {
        const wrapper = shallow(
            <ProgressiveImage {...baseProps}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when no thumbnail', () => {
        const props = {
            ...baseProps,
            thumbnailUri: null,
        };

        const wrapper = shallow(
            <ProgressiveImage {...props}/>
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});