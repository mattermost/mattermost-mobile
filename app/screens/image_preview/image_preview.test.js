// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {TouchableOpacity} from 'react-native';
import FastImage from 'react-native-fast-image';

// import RNFetchBlob from 'rn-fetch-blob';

import Preferences from '@mm-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';

// import BottomSheet from 'app/utils/bottom_sheet';

import ImagePreview from './image_preview';

jest.useFakeTimers();
jest.mock('react-intl');
jest.mock('react-native-doc-viewer', () => {
    return {
        OpenFile: jest.fn(),
    };
});

// jest.mock('react-native-permissions', () => {
//     return {
//         check: jest.fn(),
//     };
// });

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

    test('should match call getItemMeasures & mergeNavigationOptions on close', () => {
        const mergeNavigationOptions = jest.spyOn(NavigationActions, 'mergeNavigationOptions');

        const getItemMeasures = jest.fn();
        const wrapper = shallow(
            <ImagePreview
                {...baseProps}
                getItemMeasures={getItemMeasures}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().close();

        expect(mergeNavigationOptions).toHaveBeenCalledTimes(2);
        expect(mergeNavigationOptions).toHaveBeenCalledWith(
            baseProps.componentId,
            {
                layout: {
                    backgroundColor: 'transparent',
                },
            },
        );
    });

    test('renderImageComponent uses cache only for http URI', () => {
        const wrapper = shallow(
            <ImagePreview
                {...baseProps}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        const instance = wrapper.instance();

        const imageProps = {
            style: {},
            source: {uri: 'http://uri'},
        };
        const imageDimensions = {height: 100, widht: 100};
        const component = instance.renderImageComponent(imageProps, imageDimensions);

        const fastImageProps = component.props.children.props;
        expect(fastImageProps.source).toStrictEqual({
            ...imageProps.source,
            cache: FastImage.cacheControl.cacheOnly,
        });
    });

    test('renderImageComponent does not use cache for non http URI', () => {
        const wrapper = shallow(
            <ImagePreview
                {...baseProps}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        const instance = wrapper.instance();

        const imageProps = {
            style: {},
            source: {uri: 'file:///uri'},
        };
        const imageDimensions = {height: 100, widht: 100};
        const component = instance.renderImageComponent(imageProps, imageDimensions);

        const fastImageProps = component.props.children.props;
        expect(fastImageProps.source).toStrictEqual(imageProps.source);
    });

    //     test('should show bottom sheet when showDownloadOptionsIOS is called for existing video', async () => {
    //         BottomSheet.showBottomSheetWithOptions = jest.fn();
    //         RNFetchBlob.fs.exists = jest.fn().mockReturnValue(true);
    //         const formatMessage = jest.fn(({defaultMessage}) => {
    //             return defaultMessage;
    //         });

    //         const index = 0;
    //         const files = [{
    //             caption: 'caption',
    //             data: {
    //                 mime_type: 'video/mp4',
    //             },
    //         }];
    //         const props = {
    //             ...baseProps,
    //             index,
    //             files,
    //         };
    //         const wrapper = shallow(
    //             <ImagePreview
    //                 {...props}
    //             />,
    //             {context: {intl: {formatMessage}}},
    //         );

    //         const instance = wrapper.instance();
    //         await instance.showDownloadOptionsIOS();

    //         const expectedOptions = {
    //             options: ['Save Video', 'Cancel'],
    //             cancelButtonIndex: 1,
    //             anchor: null,
    //             title: files[index].caption,
    //         };
    //         expect(BottomSheet.showBottomSheetWithOptions).
    //             toHaveBeenCalledWith(expectedOptions, expect.any(Function));
    //     });

    //     test('should not show bottom sheet when showDownloadOptionsIOS is called for non-existing video', async () => {
    //         BottomSheet.showBottomSheetWithOptions = jest.fn();
    //         RNFetchBlob.fs.exists = jest.fn().mockReturnValue(false);

    //         const index = 0;
    //         const files = [{
    //             caption: 'caption',
    //             data: {
    //                 mime_type: 'video/mp4',
    //             },
    //         }];
    //         const props = {
    //             ...baseProps,
    //             index,
    //             files,
    //         };
    //         const wrapper = shallow(
    //             <ImagePreview
    //                 {...props}
    //             />,
    //             {context: {intl: {formatMessage: jest.fn()}}},
    //         );

    //         const instance = wrapper.instance();
    //         await instance.showDownloadOptionsIOS();

    //         expect(BottomSheet.showBottomSheetWithOptions).not.toHaveBeenCalled();
    //     });

    //     test('should show bottom sheet when showDownloadOptionsIOS is called for image', async () => {
    //         BottomSheet.showBottomSheetWithOptions = jest.fn();
    //         RNFetchBlob.fs.exists = jest.fn().mockReturnValue(true);
    //         const formatMessage = jest.fn(({defaultMessage}) => {
    //             return defaultMessage;
    //         });

    //         const index = 0;
    //         const files = [{
    //             caption: 'caption',
    //             data: {
    //                 mime_type: 'image/jpeg',
    //             },
    //         }];
    //         const props = {
    //             ...baseProps,
    //             index,
    //             files,
    //         };
    //         const wrapper = shallow(
    //             <ImagePreview
    //                 {...props}
    //             />,
    //             {context: {intl: {formatMessage}}},
    //         );

    //         const instance = wrapper.instance();
    //         await instance.showDownloadOptionsIOS();

//         const expectedOptions = {
//             options: ['Save Image', 'Cancel'],
//             cancelButtonIndex: 1,
//             anchor: null,
//             title: files[index].caption,
//         };
//         expect(BottomSheet.showBottomSheetWithOptions).
//             toHaveBeenCalledWith(expectedOptions, expect.any(Function));
//     });
});
