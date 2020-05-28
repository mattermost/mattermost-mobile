// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import ProgressiveImage from './progressive_image';

jest.useFakeTimers();

describe('ProgressiveImage', () => {
    test('should match snapshot for Image', () => {
        const baseProps = {
            isBackgroundImage: false,
            imageUri: 'https://images.com/image.png',
            onError: jest.fn(),
            resizeMethod: 'auto',
            resizeMode: 'contain',
            theme: Preferences.THEMES.default,
            tintDefaultSource: false,
        };

        const wrapper = shallow(<ProgressiveImage {...baseProps}/>);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for Default Image', () => {
        const baseProps = {
            isBackgroundImage: false,
            defaultSource: 'https://images.com/image.png',
            onError: jest.fn(),
            resizeMethod: 'auto',
            resizeMode: 'contain',
            theme: Preferences.THEMES.default,
            tintDefaultSource: false,
        };

        const wrapper = shallow(<ProgressiveImage {...baseProps}/>);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for BackgroundImage', () => {
        const baseProps = {
            isBackgroundImage: true,
            imageUri: 'https://images.com/image.png',
            onError: jest.fn(),
            resizeMethod: 'auto',
            resizeMode: 'contain',
            theme: Preferences.THEMES.default,
            tintDefaultSource: false,
        };

        const wrapper = shallow(<ProgressiveImage {...baseProps}/>);
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});