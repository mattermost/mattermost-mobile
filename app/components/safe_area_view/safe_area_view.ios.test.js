// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import SafeArea from 'react-native-safe-area';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';

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

    SafeArea.getSafeAreaInsetsForRootView = jest.fn().mockImplementation(() => {
        return Promise.resolve(TEST_INSETS_1);
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
});
