// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

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

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<ProgressiveImage {...baseProps}/>);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should load image', () => {
        const wrapper = shallowWithIntl(<ProgressiveImage {...baseProps}/>);
        const instance = wrapper.instance();
        const load = jest.spyOn(instance, 'load');
        load();
        expect(load).toHaveBeenCalled();
    });

    test('should set image state', () => {
        const wrapper = shallowWithIntl(<ProgressiveImage {...baseProps}/>);
        const instance = wrapper.instance();
        const setImage = jest.spyOn(instance, 'setImage');
        setImage('test.png');
        expect(setImage).toHaveBeenCalled();
        expect(wrapper.state().uri).toMatch('test.png');
    });

    test('should set thumbnail state', () => {
        const wrapper = shallowWithIntl(<ProgressiveImage {...baseProps}/>);
        const instance = wrapper.instance();
        const setThumbnail = jest.spyOn(instance, 'setThumbnail');
        setThumbnail('test.png');
        expect(setThumbnail).toHaveBeenCalled();
        expect(wrapper.state().thumb).toMatch('test.png');
    });
});