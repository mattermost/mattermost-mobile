// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@redux/constants/preferences';

import ProgressiveImage from './progressive_image';

jest.mock('react-native-fast-image', () => ({
    preload: jest.fn(),
}));

jest.useFakeTimers();

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
        const wrapper = shallow(<ProgressiveImage {...baseProps}/>);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should load image', () => {
        const wrapper = shallow(<ProgressiveImage {...baseProps}/>);
        const instance = wrapper.instance();
        jest.spyOn(instance, 'load');

        // should load image on componentDidMount
        instance.componentDidMount();
        expect(instance.load).toHaveBeenCalledTimes(1);

        // should not re-load image on componentDidUpdate with same props
        instance.componentDidUpdate(baseProps);
        expect(instance.load).toHaveBeenCalledTimes(1);

        // should re-load image on componentDidUpdate when props changed
        wrapper.setProps({filename: 'newImage'});
        expect(instance.load).toHaveBeenCalledTimes(2);

        wrapper.setProps({imageUri: 'https://images.com/new_image.png'});
        expect(instance.load).toHaveBeenCalledTimes(3);

        wrapper.setProps({thumbnailUri: 'https://images.com/new_image.png'});
        expect(instance.load).toHaveBeenCalledTimes(4);
    });

    test('should set image when imageUri is set but not the thumbnailUri', () => {
        const wrapper = shallow(
            <ProgressiveImage
                {...baseProps}
                thumbnailUri={null}
            />,
        );
        const instance = wrapper.instance();
        jest.spyOn(instance, 'setImage');

        instance.componentDidMount();
        jest.runAllTimers();
        expect(instance.setImage).toHaveBeenCalledTimes(1);
    });

    test('should set thumbnail when thumbnailUri and imageUri are set', () => {
        const wrapper = shallow(
            <ProgressiveImage
                {...baseProps}
            />,
        );
        const instance = wrapper.instance();
        jest.spyOn(instance, 'setThumbnail');
        instance.load();

        jest.runAllTimers();
        expect(instance.setThumbnail).toHaveBeenCalledTimes(1);
    });
});