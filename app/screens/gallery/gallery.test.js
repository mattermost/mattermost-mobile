// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

// import RNFetchBlob from 'rn-fetch-blob';

import Preferences from '@mm-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';

// import BottomSheet from 'app/utils/bottom_sheet';

import ImagePreview from './gallery';

jest.useFakeTimers();
jest.mock('react-intl');
jest.mock('react-native-file-viewer', () => ({
    open: jest.fn(),
}));

describe('ImagePreview', () => {
    const baseProps = {
        canDownloadFiles: true,
        deviceHeight: 400,
        deviceWidth: 300,
        files: [
            {caption: 'Caption 1', source: 'source', data: 'data'},
            {caption: 'Caption 2', source: 'source', data: 'data'},
        ],
        index: 0,
        theme: Preferences.THEMES.default,
        componentId: 'component-id',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ImagePreview {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
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
        wrapper.instance().handlePageSelected(1);

        expect(wrapper.state('index')).toEqual(1);
    });

    test('should match call popTopScreen & mergeNavigationOptions on close', () => {
        const mergeNavigationOptions = jest.spyOn(NavigationActions, 'mergeNavigationOptions');
        const popTopScreen = jest.spyOn(NavigationActions, 'popTopScreen');

        const wrapper = shallow(
            <ImagePreview
                {...baseProps}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();

        expect(mergeNavigationOptions).toHaveBeenCalledTimes(1);
        expect(popTopScreen).toHaveBeenCalled();
        expect(mergeNavigationOptions).toHaveBeenCalledWith(
            baseProps.componentId,
            {
                topBar: {
                    visible: true,
                },
            },
        );
    });
});
