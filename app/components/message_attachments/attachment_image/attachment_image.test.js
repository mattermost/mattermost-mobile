// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ImageCacheManager from 'app/utils/image_cache_manager';
import {Image} from 'react-native';
import {shallow} from 'enzyme';
import React from 'react';

const originalCacheFn = ImageCacheManager.cache;
const originalGetSizeFn = Image.getSize;

import Preferences from 'mattermost-redux/constants/preferences';

import AttachmentImage from './attachment_image';

describe('AttachmentImage', () => {
    const baseProps = {
        actions: {
            showModalOverCurrentContext: jest.fn(),
        },
        deviceHeight: 256,
        deviceWidth: 128,
        imageMetadata: {width: 32, height: 32},
        imageUrl: 'https://images.com/image.png',
        theme: Preferences.THEMES.default,
    };

    afterEach(() => {
        Image.getSize = originalGetSizeFn;
        ImageCacheManager.cache = originalCacheFn;
    });

    test('it matches snapshot', () => {
        const cacheFn = jest.fn((_, url, callback) => {
            callback(url);
        });
        ImageCacheManager.cache = cacheFn;

        const wrapper = shallow(<AttachmentImage {...baseProps}/>);
        expect(wrapper).toMatchSnapshot();
    });

    test('it sets state based on props', () => {
        const cacheFn = jest.fn((_, url, callback) => {
            callback(url);
        });
        ImageCacheManager.cache = cacheFn;

        const wrapper = shallow(<AttachmentImage {...baseProps}/>);

        const state = wrapper.state();
        expect(state.hasImage).toBe(true);
        expect(state.imageUri).toBe('https://images.com/image.png');
        expect(state.originalWidth).toBe(32);
        expect(cacheFn).toHaveBeenCalled();
    });

    test('it does not render image if no imageUrl is provided', () => {
        const cacheFn = jest.fn((_, url, callback) => {
            callback(url);
        });
        ImageCacheManager.cache = cacheFn;

        const props = {...baseProps, imageUrl: null, imageMetadata: null};
        const wrapper = shallow(<AttachmentImage {...props}/>);

        const state = wrapper.state();
        expect(state.hasImage).toBe(false);
        expect(state.imageUri).toBe(null);
        expect(cacheFn).not.toHaveBeenCalled();
    });

    test('it calls Image.getSize if metadata is not present', () => {
        const cacheFn = jest.fn((_, url, callback) => {
            callback(url);
        });
        const getSizeFn = jest.fn((_, callback) => {
            callback(64, 64);
        });
        ImageCacheManager.cache = cacheFn;
        Image.getSize = getSizeFn;

        const props = {...baseProps, imageMetadata: null};
        const wrapper = shallow(<AttachmentImage {...props}/>);

        const state = wrapper.state();
        expect(state.hasImage).toBe(true);
        expect(state.imageUri).toBe('https://images.com/image.png');
        expect(state.originalWidth).toBe(64);
        expect(cacheFn).toHaveBeenCalled();
        expect(getSizeFn).toHaveBeenCalled();
    });

    test('it updates image when imageUrl prop changes', () => {
        const cacheFn = jest.fn((_, url, callback) => {
            callback(url);
        });
        ImageCacheManager.cache = cacheFn;

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
        expect(cacheFn).toHaveBeenCalledTimes(2);
    });

    test('it does not update image when an unrelated prop changes', () => {
        const cacheFn = jest.fn((_, url, callback) => {
            callback(url);
        });
        ImageCacheManager.cache = cacheFn;

        const wrapper = shallow(<AttachmentImage {...baseProps}/>);

        wrapper.setProps({
            theme: {...Preferences.THEMES.default},
        });

        const state = wrapper.state();
        expect(state.hasImage).toBe(true);
        expect(state.imageUri).toBe('https://images.com/image.png');
        expect(state.originalWidth).toBe(32);
        expect(cacheFn).toHaveBeenCalledTimes(1);
    });
});
