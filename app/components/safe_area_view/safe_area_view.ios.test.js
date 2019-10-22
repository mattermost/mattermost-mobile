// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import SafeArea from 'react-native-safe-area';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import EphemeralStore from 'app/store/ephemeral_store';

import SafeAreaIos from './safe_area_view.ios';

describe('SafeAreaIos', () => {
    const baseProps = {
        children: [],
        keyboardOffset: 100,
        useLandscapeMargin: false,
        theme: Preferences.THEMES.default,
    };

    const TEST_INSETS_1 = {
        safeAreaInsets: {
            top: 123,
            left: 123,
            bottom: 123,
            right: 123,
        },
    };

    const TEST_INSETS_2 = {
        safeAreaInsets: {
            top: 456,
            left: 456,
            bottom: 456,
            right: 456,
        },
    };

    const PORTRAIT_INSETS = {
        safeAreaInsets: {
            top: 111,
            left: 111,
            bottom: 111,
            right: 111,
        },
    };

    const LANDSCAPE_INSETS = {
        safeAreaInsets: {
            top: 222,
            left: 222,
            bottom: 222,
            right: 222,
        },
    };

    const IGNORED_INSETS = {
        safeAreaInsets: {
            top: 333,
            left: 333,
            bottom: 333,
            right: 333,
        },
    };

    SafeArea.getSafeAreaInsetsForRootView = jest.fn().mockImplementation(() => {
        return Promise.resolve(TEST_INSETS_1);
    });

    beforeEach(() => {
        EphemeralStore.safeAreaInsets = {
            portrait: null,
            landscape: null,
        };
    });

    test('should match snapshot', () => {
        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should get safe area insets on mount if DeviceTypes.IS_IPHONE_WITH_INSETS is true', async () => {
        DeviceTypes.IS_IPHONE_WITH_INSETS = true;
        mattermostManaged.hasSafeAreaInsets = false;

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(SafeArea.getSafeAreaInsetsForRootView).toHaveBeenCalled();
        await SafeArea.getSafeAreaInsetsForRootView();
        expect(wrapper.state().safeAreaInsets).toEqual(TEST_INSETS_1.safeAreaInsets);
    });

    test('should get safe area insets on mount if mattermostManaged.hasSafeAreaInsets is true', async () => {
        DeviceTypes.IS_IPHONE_WITH_INSETS = false;
        mattermostManaged.hasSafeAreaInsets = true;

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(SafeArea.getSafeAreaInsetsForRootView).toHaveBeenCalled();
        await SafeArea.getSafeAreaInsetsForRootView();
        expect(wrapper.state().safeAreaInsets).toEqual(TEST_INSETS_1.safeAreaInsets);
    });

    test('should not get safe area insets on mount if neither DeviceTypes.IS_IPHONE_WITH_INSET nor mattermostManaged.hasSafeAreaInsets is true', async () => {
        DeviceTypes.IS_IPHONE_WITH_INSETS = false;
        mattermostManaged.hasSafeAreaInsets = false;

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(SafeArea.getSafeAreaInsetsForRootView).not.toHaveBeenCalled();
        await SafeArea.getSafeAreaInsetsForRootView();
        expect(wrapper.state().safeAreaInsets).not.toEqual(TEST_INSETS_1.safeAreaInsets);
    });

    test('should set safe area insets on change if mounted and DeviceTypes.IS_IPHONE_WITH_INSETS is true', () => {
        DeviceTypes.IS_IPHONE_WITH_INSETS = true;
        mattermostManaged.hasSafeAreaInsets = false;

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(wrapper.state().safeAreaInsets).not.toEqual(TEST_INSETS_2.safeAreaInsets);

        const instance = wrapper.instance();
        instance.onSafeAreaInsetsForRootViewChange(TEST_INSETS_2);
        expect(wrapper.state().safeAreaInsets).toEqual(TEST_INSETS_2.safeAreaInsets);
    });

    test('should set safe area insets on change if mounted and mattermostManaged.hasSafeAreaInsets is true', () => {
        DeviceTypes.IS_IPHONE_WITH_INSETS = false;
        mattermostManaged.hasSafeAreaInsets = true;

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(wrapper.state().safeAreaInsets).not.toEqual(TEST_INSETS_2.safeAreaInsets);

        const instance = wrapper.instance();
        instance.onSafeAreaInsetsForRootViewChange(TEST_INSETS_2);
        expect(wrapper.state().safeAreaInsets).toEqual(TEST_INSETS_2.safeAreaInsets);
    });

    test('should not set safe area insets on change if mounted and neither DeviceTypes.IS_IPHONE_WITH_INSETS nor mattermostManaged.hasSafeAreaInsets is true', () => {
        DeviceTypes.IS_IPHONE_WITH_INSETS = false;
        mattermostManaged.hasSafeAreaInsets = false;

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(wrapper.state().safeAreaInsets).not.toEqual(TEST_INSETS_2.safeAreaInsets);

        const instance = wrapper.instance();
        instance.onSafeAreaInsetsForRootViewChange(TEST_INSETS_2);
        expect(wrapper.state().safeAreaInsets).not.toEqual(TEST_INSETS_2.safeAreaInsets);
    });

    test('should set safe area insets on change not mounted', () => {
        DeviceTypes.IS_IPHONE_WITH_INSETS = true;
        mattermostManaged.hasSafeAreaInsets = true;

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(wrapper.state().safeAreaInsets).not.toEqual(TEST_INSETS_2.safeAreaInsets);

        const instance = wrapper.instance();
        instance.mounted = false;
        instance.onSafeAreaInsetsForRootViewChange(TEST_INSETS_2);
        expect(wrapper.state().safeAreaInsets).not.toEqual(TEST_INSETS_2.safeAreaInsets);
    });

    test('should set portrait safe area insets', () => {
        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(wrapper.state().safeAreaInsets).not.toEqual(PORTRAIT_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(null);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(null);

        const landscape = false;
        const instance = wrapper.instance();
        instance.setSafeAreaInsets(PORTRAIT_INSETS.safeAreaInsets, landscape);
        expect(wrapper.state().safeAreaInsets).toEqual(PORTRAIT_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(PORTRAIT_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(null);
    });

    test('should set portrait safe area insets from EphemeralStore', () => {
        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        EphemeralStore.safeAreaInsets.portrait = PORTRAIT_INSETS.safeAreaInsets;
        expect(wrapper.state().safeAreaInsets).not.toEqual(PORTRAIT_INSETS.safeAreaInsets);

        const landscape = false;
        const instance = wrapper.instance();
        instance.setSafeAreaInsets(IGNORED_INSETS.safeAreaInsets, landscape);
        expect(wrapper.state().safeAreaInsets).toEqual(PORTRAIT_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(PORTRAIT_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(null);
    });

    test('should set landscape safe area insets', () => {
        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        expect(wrapper.state().safeAreaInsets).not.toEqual(LANDSCAPE_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(null);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(null);

        const landscape = true;
        const instance = wrapper.instance();
        instance.setSafeAreaInsets(LANDSCAPE_INSETS.safeAreaInsets, landscape);
        expect(wrapper.state().safeAreaInsets).toEqual(LANDSCAPE_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(LANDSCAPE_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(null);
    });

    test('should set landscape safe area insets from EphemeralStore', () => {
        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );

        EphemeralStore.safeAreaInsets.landscape = LANDSCAPE_INSETS.safeAreaInsets;
        expect(wrapper.state().safeAreaInsets).not.toEqual(LANDSCAPE_INSETS.safeAreaInsets);

        const landscape = true;
        const instance = wrapper.instance();
        instance.setSafeAreaInsets(IGNORED_INSETS.safeAreaInsets, landscape);
        expect(wrapper.state().safeAreaInsets).toEqual(LANDSCAPE_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(LANDSCAPE_INSETS.safeAreaInsets);
        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(null);
    });

    test('should add safeAreaInsetsForRootViewDidChange listener when EphemeralStore values are not set', () => {
        const addEventListener = jest.spyOn(SafeArea, 'addEventListener');

        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(null);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(null);
        let wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );
        let instance = wrapper.instance();
        expect(addEventListener).toHaveBeenCalledWith('safeAreaInsetsForRootViewDidChange', instance.onSafeAreaInsetsForRootViewChange);
        addEventListener.mockClear();

        EphemeralStore.safeAreaInsets.portrait = TEST_INSETS_1.safeAreaInsets;
        wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );
        instance = wrapper.instance();
        expect(addEventListener).toHaveBeenCalledWith('safeAreaInsetsForRootViewDidChange', instance.onSafeAreaInsetsForRootViewChange);
        addEventListener.mockClear();

        EphemeralStore.safeAreaInsets.portrait = TEST_INSETS_1.safeAreaInsets;
        EphemeralStore.safeAreaInsets.landscape = TEST_INSETS_1.safeAreaInsets;
        wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );
        instance = wrapper.instance();
        expect(addEventListener).not.toHaveBeenCalled();
    });

    test('should remove safeAreaInsetsForRootViewDidChange listener when EphemeralStore values are set', () => {
        const removeEventListener = jest.spyOn(SafeArea, 'removeEventListener');

        const wrapper = shallow(
            <SafeAreaIos {...baseProps}/>
        );
        const instance = wrapper.instance();
        expect(EphemeralStore.safeAreaInsets.portrait).toEqual(null);
        expect(EphemeralStore.safeAreaInsets.landscape).toEqual(null);

        instance.onSafeAreaInsetsForRootViewChange(TEST_INSETS_1);
        expect(removeEventListener).not.toHaveBeenCalled();

        EphemeralStore.safeAreaInsets.portrait = TEST_INSETS_1.safeAreaInsets;
        instance.onSafeAreaInsetsForRootViewChange(TEST_INSETS_1);
        expect(removeEventListener).not.toHaveBeenCalled();

        EphemeralStore.safeAreaInsets.landscape = TEST_INSETS_1.safeAreaInsets;
        instance.onSafeAreaInsetsForRootViewChange(TEST_INSETS_1);
        expect(removeEventListener).toHaveBeenCalledWith('safeAreaInsetsForRootViewDidChange', instance.onSafeAreaInsetsForRootViewChange);
    });
});
