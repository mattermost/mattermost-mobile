// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from 'mattermost-redux/constants/preferences';

import {shallowWithIntl} from 'test/intl-test-helper';
import EmojiPicker, {filterEmojiSearchInput} from './emoji_picker.js';

describe('components/emoji_picker/EmojiPicker', () => {
    const baseProps = {
        actions: {
            getCustomEmojis: jest.fn(),
            incrementEmojiPickerPage: jest.fn(),
            searchCustomEmojis: jest.fn(),
        },
        customEmojisEnabled: false,
        customEmojiPage: 200,
        deviceWidth: 400,
        emojis: [],
        emojisBySection: [],
        fuse: {},
        isLandscape: false,
        theme: Preferences.THEMES.default,
    };

    const testCases = [
        {input: 'smile', output: 'smile'},
        {input: 'SMILE', output: 'smile'},
        {input: ':smile', output: 'smile'},
        {input: ':SMILE', output: 'smile'},
        {input: 'smile:', output: 'smile'},
        {input: 'SMILE:', output: 'smile'},
        {input: ':smile:', output: 'smile'},
        {input: ':SMILE:', output: 'smile'},
    ];

    testCases.forEach((testCase) => {
        test(`'${testCase.input}' should return '${testCase.output}'`, () => {
            expect(filterEmojiSearchInput(testCase.input)).toEqual(testCase.output);
        });
    });

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<EmojiPicker {...baseProps}/>);
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should set rebuildEmojis to true when deviceWidth changes', () => {
        const wrapper = shallowWithIntl(<EmojiPicker {...baseProps}/>);
        const instance = wrapper.instance();

        expect(instance.rebuildEmojis).toBe(undefined);

        const newDeviceWidth = baseProps.deviceWidth * 2;
        wrapper.setProps({deviceWidth: newDeviceWidth});

        expect(instance.rebuildEmojis).toBe(true);
    });

    test('should set rebuildEmojis to true and new deviceWidth when emojis change', () => {
        const wrapper = shallowWithIntl(<EmojiPicker {...baseProps}/>);
        const instance = wrapper.instance();

        expect(instance.rebuildEmojis).toBe(undefined);
        expect(instance.deviceWidth).toBe(undefined);

        const newDeviceWidth = baseProps.deviceWidth * 2;
        const newEmojis = [{}];
        wrapper.setProps({deviceWidth: newDeviceWidth, emojis: newEmojis});

        expect(instance.rebuildEmojis).toBe(true);
        expect(instance.deviceWidth).toBe(newDeviceWidth);
    });

    test('should set rebuilt emojis when rebuildEmojis is true and searchBarAnimationComplete is true', () => {
        const wrapper = shallowWithIntl(<EmojiPicker {...baseProps}/>);
        const instance = wrapper.instance();
        instance.setState = jest.fn();
        instance.renderableEmojis = jest.spyOn(instance, 'renderableEmojis');

        instance.rebuildEmojis = true;
        const searchBarAnimationComplete = true;
        const setRebuiltEmojis = jest.spyOn(instance, 'setRebuiltEmojis');
        setRebuiltEmojis(searchBarAnimationComplete);

        expect(instance.setState).toHaveBeenCalledWith({emojis: []});
        expect(instance.rebuildEmojis).toBe(false);
    });

    test('should not set rebuilt emojis when rebuildEmojis is false and searchBarAnimationComplete is true', () => {
        const wrapper = shallowWithIntl(<EmojiPicker {...baseProps}/>);
        const instance = wrapper.instance();
        instance.setState = jest.fn();

        instance.rebuildEmojis = false;
        const searchBarAnimationComplete = true;
        const setRebuiltEmojis = jest.spyOn(instance, 'setRebuiltEmojis');
        setRebuiltEmojis(searchBarAnimationComplete);

        expect(instance.setState).not.toHaveBeenCalled();
    });

    test('should not set rebuilt emojis when rebuildEmojis is true and searchBarAnimationComplete is false', () => {
        const wrapper = shallowWithIntl(<EmojiPicker {...baseProps}/>);
        const instance = wrapper.instance();
        instance.setState = jest.fn();

        instance.rebuildEmojis = true;
        const searchBarAnimationComplete = false;
        const setRebuiltEmojis = jest.spyOn(instance, 'setRebuiltEmojis');
        setRebuiltEmojis(searchBarAnimationComplete);

        expect(instance.setState).not.toHaveBeenCalled();
    });
});
