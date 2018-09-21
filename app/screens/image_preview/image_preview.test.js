// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {
    TouchableOpacity,
} from 'react-native';

import Preferences from 'mattermost-redux/constants/preferences';

import ImagePreview from './image_preview';

jest.useFakeTimers();
jest.mock('react-intl');
jest.mock('react-native-doc-viewer', () => {
    return {
        OpenFile: jest.fn(),
    };
});

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
        navigator: {setStyle: jest.fn()},
        origin: {},
        target: {},
        theme: Preferences.THEMES.default,
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

    test('should match state on handleChangeImage', () => {
        const wrapper = shallow(
            <ImagePreview {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.setState({index: 0});
        wrapper.instance().handleChangeImage(1);

        expect(wrapper.state('index')).toEqual(1);
    });

    test('should match call getItemMeasures & navigator.setStyle on close', () => {
        const getItemMeasures = jest.fn();
        const navigator = {setStyle: jest.fn()};
        const wrapper = shallow(
            <ImagePreview
                {...baseProps}
                getItemMeasures={getItemMeasures}
                navigator={navigator}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();

        expect(navigator.setStyle).toHaveBeenCalledTimes(2);
        expect(navigator.setStyle).toBeCalledWith({screenBackgroundColor: 'transparent'});
    });
});
