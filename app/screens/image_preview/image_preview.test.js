// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {
    TouchableOpacity,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import Preferences from 'mattermost-redux/constants/preferences';

import ImagePreview from './image_preview';

jest.useFakeTimers();
jest.mock('react-intl');
jest.mock('react-native-doc-viewer', () => {
    return {
        OpenFile: jest.fn(),
    };
});
jest.mock('react-native-navigation', () => ({
    Navigation: {
        mergeOptions: jest.fn(),
    },
}));

Navigation.mergeOptions = jest.fn();

describe('ImagePreview', () => {
    const baseProps = {
        canDownloadFiles: true,
        deviceHeight: 400,
        deviceWidth: 300,
        files: [
            {caption: 'Caption 1', source: 'source', data: 'data'},
            {caption: 'Caption 2', source: 'source', data: 'data'},
        ],
        getItemMeasures: jest.fn(),
        index: 0,
        origin: {},
        target: {},
        theme: Preferences.THEMES.default,
        componentId: 'component-id',
        actions: {
            dismissModal: jest.fn(),
            showModalOverCurrentContext: jest.fn(),
        },
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ImagePreview {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(TouchableOpacity).first().exists()).toEqual(true);
    });

    test('should match snapshot, renderDownloadButton', () => {
        const wrapper = shallow(
            <ImagePreview {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.instance().renderDownloadButton()).toMatchSnapshot();
    });

    test('should match snapshot and not renderDownloadButton for local files', () => {
        const props = {
            ...baseProps,
            files: [{caption: 'Caption 1', source: 'source', data: {localPath: 'path'}}],
        };

        const wrapper = shallow(
            <ImagePreview {...props}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.instance().renderDownloadButton()).toMatchSnapshot();
        expect(wrapper.instance().renderDownloadButton()).toBeNull();
    });

    test('should match state on handleChangeImage', () => {
        const wrapper = shallow(
            <ImagePreview {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.setState({index: 0});
        wrapper.instance().handleChangeImage(1);

        expect(wrapper.state('index')).toEqual(1);
    });

    test('should match call getItemMeasures & Navigation.mergeOptions on close', () => {
        const getItemMeasures = jest.fn();
        const wrapper = shallow(
            <ImagePreview
                {...baseProps}
                getItemMeasures={getItemMeasures}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();

        expect(Navigation.mergeOptions).toHaveBeenCalledTimes(2);
        expect(Navigation.mergeOptions).toHaveBeenCalledWith(
            baseProps.componentId,
            {
                layout: {
                    backgroundColor: 'transparent',
                },
            },
        );
    });
});
