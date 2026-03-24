// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ImageFile from './image_file';

jest.mock('@actions/remote/file', () => ({
    buildFilePreviewUrl: jest.fn().mockReturnValue('https://server/preview/file1'),
    buildFileUrl: jest.fn().mockReturnValue('https://server/files/file1'),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('https://server'),
}));

jest.mock('@store/ephemeral_store', () => ({
    __esModule: true,
    default: {
        isFileRejected: jest.fn().mockReturnValue(false),
    },
}));

jest.mock('@components/progressive_image', () => {
    const {View, Text} = require('react-native');
    return {
        __esModule: true,
        default: (props: Record<string, unknown>) => (
            <View testID='progressive-image'>
                {props.imageUri && <Text testID='image-uri'>{String(props.imageUri)}</Text>}
                {props.defaultSource && <Text testID='default-source'>{JSON.stringify(props.defaultSource)}</Text>}
            </View>
        ),
    };
});

jest.mock('./file_icon', () => 'FileIcon');

describe('ImageFile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should use buildFileUrl for GIF files without localPath', () => {
        const gifFile = TestHelper.fakeFileInfo({
            id: 'gif1',
            mime_type: 'image/gif',
            name: 'animation.gif',
            extension: 'gif',
            has_preview_image: true,
            localPath: undefined,
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <ImageFile
                file={gifFile}
                inViewPort={true}
            />,
        );

        expect(buildFileUrl).toHaveBeenCalledWith('https://server', 'gif1', undefined);
        expect(buildFilePreviewUrl).not.toHaveBeenCalled();
        expect(getByTestId('image-uri')).toHaveTextContent('https://server/files/file1');
    });

    it('should use buildFilePreviewUrl for non-GIF files with has_preview_image', () => {
        const pngFile = TestHelper.fakeFileInfo({
            id: 'png1',
            mime_type: 'image/png',
            name: 'photo.png',
            extension: 'png',
            has_preview_image: true,
            localPath: undefined,
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <ImageFile
                file={pngFile}
                inViewPort={true}
            />,
        );

        expect(buildFilePreviewUrl).toHaveBeenCalledWith('https://server', 'png1');
        expect(buildFileUrl).not.toHaveBeenCalled();
        expect(getByTestId('image-uri')).toHaveTextContent('https://server/preview/file1');
    });

    it('should use buildFileUrl for non-GIF files without has_preview_image', () => {
        const file = TestHelper.fakeFileInfo({
            id: 'file1',
            mime_type: 'image/png',
            name: 'image.png',
            extension: 'png',
            has_preview_image: false,
            localPath: undefined,
        });

        renderWithIntlAndTheme(
            <ImageFile
                file={file}
                inViewPort={true}
            />,
        );

        expect(buildFileUrl).toHaveBeenCalledWith('https://server', 'file1', undefined);
        expect(buildFilePreviewUrl).not.toHaveBeenCalled();
    });

    it('should use localPath when available regardless of file type', () => {
        const gifFile = TestHelper.fakeFileInfo({
            id: 'gif1',
            mime_type: 'image/gif',
            name: 'animation.gif',
            extension: 'gif',
            has_preview_image: true,
            localPath: '/data/files/animation.gif',
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <ImageFile file={gifFile}/>,
        );

        expect(buildFileUrl).not.toHaveBeenCalled();
        expect(buildFilePreviewUrl).not.toHaveBeenCalled();
        expect(getByTestId('default-source')).toHaveTextContent(JSON.stringify({uri: 'file:///data/files/animation.gif'}));
    });
});
