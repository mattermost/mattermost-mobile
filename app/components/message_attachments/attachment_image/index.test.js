// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'react-native';
import {shallow} from 'enzyme';
import React from 'react';

const originalGetSizeFn = Image.getSize;

import Preferences from 'mattermost-redux/constants/preferences';

import AttachmentImage from './index';

describe('AttachmentImage', () => {
    const baseProps = {
        deviceHeight: 256,
        deviceWidth: 128,
        imageMetadata: {width: 32, height: 32},
        imageUrl: 'https://images.com/image.png',
        theme: Preferences.THEMES.default,
    };

    afterEach(() => {
        Image.getSize = originalGetSizeFn;
    });

    test('it matches snapshot', () => {
        const wrapper = shallow(<AttachmentImage {...baseProps}/>);
        expect(wrapper).toMatchSnapshot();
    });

    test('it sets state based on props', () => {
        const wrapper = shallow(<AttachmentImage {...baseProps}/>);

        const state = wrapper.state();
        expect(state.hasImage).toBe(true);
        expect(state.imageUri).toBe('https://images.com/image.png');
        expect(state.originalWidth).toBe(32);
    });

    test('it does not render image if no imageUrl is provided', () => {
        const props = {...baseProps, imageUrl: null, imageMetadata: null};
        const wrapper = shallow(<AttachmentImage {...props}/>);

        const state = wrapper.state();
        expect(state.hasImage).toBe(false);
        expect(state.imageUri).toBe(null);
    });

    test('it calls Image.getSize if metadata is not present', () => {
        const getSizeFn = jest.fn((_, callback) => {
            callback(64, 64);
        });
        Image.getSize = getSizeFn;

        const props = {...baseProps, imageMetadata: null};
        const wrapper = shallow(<AttachmentImage {...props}/>);

        const state = wrapper.state();
        expect(state.hasImage).toBe(true);
        expect(state.imageUri).toBe('https://images.com/image.png');
        expect(state.originalWidth).toBe(64);
        expect(getSizeFn).toHaveBeenCalled();
    });

    test('it updates image when imageUrl prop changes', () => {
        const wrapper = shallow(<AttachmentImage {...baseProps}/>);

        wrapper.setProps({
            imageUrl: 'https://someothersite.com/picture.png',
            imageMetadata: {
                width: 96,
                height: 96,
            },
        });

        const state = wrapper.state();
        expect(state.hasImage).toBe(true);
        expect(state.imageUri).toBe('https://someothersite.com/picture.png');
        expect(state.originalWidth).toBe(96);
    });

    test('it does not update image when an unrelated prop changes', () => {
        const wrapper = shallow(<AttachmentImage {...baseProps}/>);

        wrapper.setProps({
            theme: {...Preferences.THEMES.default},
        });

        const state = wrapper.state();
        expect(state.hasImage).toBe(true);
        expect(state.imageUri).toBe('https://images.com/image.png');
        expect(state.originalWidth).toBe(32);
    });
});
