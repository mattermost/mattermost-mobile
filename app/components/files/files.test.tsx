// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */
import {render, fireEvent, act, waitFor} from '@testing-library/react-native';
import React, {useMemo, type ComponentProps} from 'react';
import {DeviceEventEmitter, Text, TouchableOpacity, View} from 'react-native';

import {Events} from '@constants';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import TestHelper from '@test/test_helper';
import {fileExists, isImage, isVideo} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {getViewPortWidth} from '@utils/images';

import File from './file';
import Files from './files';

import type {PostConfig} from '@context/post_config';
import type FileModel from '@typings/database/models/servers/file';

let mockPostConfigValue: Partial<PostConfig> = {
    canDownloadFiles: true,
    enableSecureFilePreview: false,
};

jest.mock('@context/post_config', () => ({
    usePostConfig: () => mockPostConfigValue,
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

jest.mock('@hooks/files', () => ({
    useImageAttachments: jest.fn().mockReturnValue({
        images: [],
        nonImages: [],
    }),
}));

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: (fn: () => void) => fn,
}));

jest.mock('@utils/file', () => ({
    fileExists: jest.fn().mockResolvedValue(true),
    isImage: jest.fn().mockReturnValue(true),
    isVideo: jest.fn().mockReturnValue(false),
}));

jest.mock('@utils/gallery', () => ({
    fileToGalleryItem: jest.fn(),
    openGalleryAtIndex: jest.fn(),
}));

jest.mock('@utils/images', () => ({
    getViewPortWidth: jest.fn().mockReturnValue(300),
}));

jest.mock('./file', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(File).mockImplementation((props) => (
    <View testID={props.file.id}>
        <Text testID={`${props.file.id}-galleryIdentifier`}>{props.galleryIdentifier}</Text>
        <Text testID={`${props.file.id}-canDownloadFiles`}>{String(props.canDownloadFiles)}</Text>
        <Text testID={`${props.file.id}-index`}>{props.index}</Text>
        <Text testID={`${props.file.id}-isSingleImage`}>{String(props.isSingleImage)}</Text>
        <Text testID={`${props.file.id}-nonVisibleImagesCount`}>{String(props.nonVisibleImagesCount)}</Text>
        <Text testID={`${props.file.id}-wrapperWidth`}>{props.wrapperWidth}</Text>
        <Text testID={`${props.file.id}-inViewPort`}>{String(props.inViewPort)}</Text>
        <Text testID={`${props.file.id}-enableSecureFilePreview`}>{String(props.enableSecureFilePreview)}</Text>
        <TouchableOpacity
            testID={`${props.file.id}-onPress`}
            onPress={() => props.onPress(props.index)}
        />
        <TouchableOpacity
            testID={`${props.file.id}-updateFileForGallery`}
            onPress={() => props.updateFileForGallery(props.index, {...props.file, uri: 'updated'})}
        />
    </View>
));

function getBaseProps(): ComponentProps<typeof Files> {
    return {
        failed: false,
        filesInfo: [],
        isReplyPost: false,
        layoutWidth: 300,
        location: 'test-location',
        postId: 'test-post-id',
        postProps: {},
    };
}

describe('Files', () => {
    beforeEach(() => {
        mockPostConfigValue = {
            canDownloadFiles: true,
            enableSecureFilePreview: false,
        };
        jest.clearAllMocks();

        // Mock fileExists to resolve immediately to avoid timing issues
        jest.mocked(fileExists).mockImplementation(async () => true);
    });

    it('should render attachments, with images in the image row', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
            TestHelper.fakeFileInfo({id: '3'}),
            TestHelper.fakeFileInfo({id: '4'}),
        ];
        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1' || f.id === '2'),
                nonImages: fi.filter((f) => f.id === '3' || f.id === '4'),
            }), [fi]);
        });

        const {getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('1')).toBeVisible();
        });

        expect(getByTestId('2')).toBeVisible();
        expect(getByTestId('3')).toBeVisible();
        expect(getByTestId('4')).toBeVisible();
        expect(getByTestId('image-row')).toContainElement(getByTestId('1'));
        expect(getByTestId('image-row')).toContainElement(getByTestId('2'));
        expect(getByTestId('image-row')).not.toContainElement(getByTestId('3'));
        expect(getByTestId('image-row')).not.toContainElement(getByTestId('4'));
    });

    it('should not show the image row if no images', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '3'}),
            TestHelper.fakeFileInfo({id: '4'}),
        ];
        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1' || f.id === '2'),
                nonImages: fi.filter((f) => f.id === '3' || f.id === '4'),
            }), [fi]);
        });

        const {getByTestId, queryByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('3')).toBeVisible();
        });

        expect(getByTestId('4')).toBeVisible();
        expect(queryByTestId('image-row')).not.toBeVisible();
    });

    it('should have different opacity if failed', async () => {
        const baseProps = getBaseProps();
        baseProps.failed = true;

        const {getByTestId, rerender} = render(
            <Files {...baseProps}/>,
        );

        await waitFor(() => {
            expect(getByTestId('files-container')).toHaveStyle({opacity: 0.5});
        });

        act(() => {
            baseProps.failed = false;
            rerender(<Files {...baseProps}/>);
        });

        await waitFor(() => {
            expect(getByTestId('files-container')).not.toHaveStyle({opacity: 0.5});
        });
    });

    it('should set layoutWidth if provided', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1'),
                nonImages: fi.filter((f) => f.id === '2'),
            }), [fi]);
        });

        const baseProps = getBaseProps();
        baseProps.filesInfo = filesInfo;
        baseProps.layoutWidth = 400;

        const {getByTestId, rerender} = render(<Files {...baseProps}/>);

        await waitFor(() => {
            expect(getByTestId('1-wrapperWidth')).toHaveTextContent('400');
        });

        expect(getByTestId('2-wrapperWidth')).toHaveTextContent('400');
        expect(getByTestId('image-row')).toHaveStyle({width: 400});

        baseProps.layoutWidth = 500;
        rerender(<Files {...baseProps}/>);

        await waitFor(() => {
            expect(getByTestId('1-wrapperWidth')).toHaveTextContent('500');
        });

        expect(getByTestId('2-wrapperWidth')).toHaveTextContent('500');
        expect(getByTestId('image-row')).toHaveStyle({width: 500});
    });

    it('should use ((getViewportWidth result) - 6) if layoutWidth is not provided', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1'),
                nonImages: fi.filter((f) => f.id === '2'),
            }), [fi]);
        });
        jest.mocked(getViewPortWidth).mockReturnValue(300);
        jest.mocked(useIsTablet).mockReturnValue(false);

        const baseProps = getBaseProps();
        baseProps.filesInfo = filesInfo;
        baseProps.layoutWidth = undefined;
        baseProps.isReplyPost = false;

        const {getByTestId, rerender} = render(<Files {...baseProps}/>);

        await waitFor(() => {
            expect(getByTestId('1-wrapperWidth')).toHaveTextContent('294');
        });

        expect(getByTestId('2-wrapperWidth')).toHaveTextContent('294');
        expect(getByTestId('image-row')).toHaveStyle({width: 294});
        expect(getViewPortWidth).toHaveBeenCalledWith(false, false);

        jest.mocked(getViewPortWidth).mockReturnValue(400);
        jest.mocked(useIsTablet).mockReturnValue(true);
        baseProps.isReplyPost = true;

        rerender(<Files {...baseProps}/>);

        await waitFor(() => {
            expect(getByTestId('1-wrapperWidth')).toHaveTextContent('394');
        });

        expect(getByTestId('2-wrapperWidth')).toHaveTextContent('394');
        expect(getByTestId('image-row')).toHaveStyle({width: 394});
        expect(getViewPortWidth).toHaveBeenCalledWith(true, true);
    });

    it('calling onPress on the child should open gallery', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1'),
                nonImages: fi.filter((f) => f.id === '2'),
            }), [fi]);
        });

        jest.mocked(fileToGalleryItem).mockImplementation((file) => ({
            height: 100,
            id: file.id || '',
            lastPictureUpdate: 0,
            mime_type: file.mime_type,
            name: file.name,
            type: 'image',
            uri: file.uri || '',
            width: file.width,
            cacheKey: file.id || '',
        }));

        const {getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );
        await waitFor(() => expect(getByTestId('1')).toBeVisible());

        fireEvent.press(getByTestId('1-onPress'));
        expect(openGalleryAtIndex).toHaveBeenCalledWith(
            'test-post-id-fileAttachments-test-location',
            0,
            expect.arrayContaining([expect.objectContaining({id: '1'}), expect.objectContaining({id: '2'})]),
        );

        fireEvent.press(getByTestId('2-onPress'));
        expect(openGalleryAtIndex).toHaveBeenCalledWith(
            'test-post-id-fileAttachments-test-location',
            1,
            expect.arrayContaining([expect.objectContaining({id: '1'}), expect.objectContaining({id: '2'})]),
        );
    });

    it('calling updateFileForGallery updates the file', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', uri: 'original'}),
            TestHelper.fakeFileInfo({id: '2', uri: 'original'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1'),
                nonImages: fi.filter((f) => f.id === '2'),
            }), [fi]);
        });

        jest.mocked(fileToGalleryItem).mockImplementation((file) => ({
            height: 100,
            id: file.id || '',
            lastPictureUpdate: 0,
            mime_type: file.mime_type,
            name: file.name,
            type: 'image',
            uri: file.uri || '',
            width: file.width,
            cacheKey: file.id || '',
        }));

        const {getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );
        await waitFor(() => expect(getByTestId('1')).toBeVisible());

        fireEvent.press(getByTestId('1-updateFileForGallery'));
        fireEvent.press(getByTestId('1-onPress'));
        expect(openGalleryAtIndex).toHaveBeenCalledWith(
            'test-post-id-fileAttachments-test-location',
            0,
            expect.arrayContaining([expect.objectContaining({id: '1', uri: 'updated'}), expect.objectContaining({id: '2', uri: 'original'})]),
        );

        fireEvent.press(getByTestId('2-onPress'));
        expect(openGalleryAtIndex).toHaveBeenCalledWith(
            'test-post-id-fileAttachments-test-location',
            1,
            expect.arrayContaining([expect.objectContaining({id: '1', uri: 'updated'}), expect.objectContaining({id: '2', uri: 'original'})]),
        );
    });

    it('should update files for gallery on new props', async () => {
        let filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: ''}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi,
                nonImages: [],
            }), [fi]);
        });

        const {rerender, getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('1')).toBeVisible();
        });

        filesInfo = [
            TestHelper.fakeFileInfo({id: '2', localPath: ''}),
        ];

        rerender(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('2')).toBeVisible();
        });
    });

    it('should set inViewPort to true on ITEM_IN_VIEWPORT event', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', name: 'image1.png', user_id: 'user1'}),
            TestHelper.fakeFileInfo({id: '2', name: 'image2.png', user_id: 'user2'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1'),
                nonImages: fi.filter((f) => f.id === '2'),
            }), [fi]);
        });

        const {getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );
        await waitFor(() => expect(getByTestId('1')).toBeVisible());

        expect(getByTestId('1-inViewPort')).toHaveTextContent('false');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('false');
        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {'unrelated-event': true});
        });
        expect(getByTestId('1-inViewPort')).toHaveTextContent('false');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('false');

        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {'test-location-test-post-id': true});
        });

        expect(getByTestId('1-inViewPort')).toHaveTextContent('true');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('true');
    });

    it('should ignore ITEM_IN_VIEWPORT event if not for the current post or location', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', name: 'image1.png', user_id: 'user1'}),
            TestHelper.fakeFileInfo({id: '2', name: 'image2.png', user_id: 'user2'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1'),
                nonImages: fi.filter((f) => f.id === '2'),
            }), [fi]);
        });

        const baseProps = getBaseProps();
        baseProps.filesInfo = filesInfo;
        baseProps.location = 'location1';
        baseProps.postId = 'post1';

        const {getByTestId, rerender} = render(<Files {...baseProps}/>);
        await waitFor(() => expect(getByTestId('1')).toBeVisible());

        expect(getByTestId('1-inViewPort')).toHaveTextContent('false');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('false');

        baseProps.location = 'location2';
        rerender(<Files {...baseProps}/>);
        await waitFor(() => expect(getByTestId('1')).toBeVisible());
        expect(getByTestId('1-inViewPort')).toHaveTextContent('false');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('false');

        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {'location1-post1': true});
        });
        expect(getByTestId('1-inViewPort')).toHaveTextContent('false');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('false');

        baseProps.postId = 'post2';
        rerender(<Files {...baseProps}/>);
        expect(getByTestId('1-inViewPort')).toHaveTextContent('false');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('false');

        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {'location2-post1': true});
        });
        expect(getByTestId('1-inViewPort')).toHaveTextContent('false');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('false');

        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {'location2-post2': true});
        });
        expect(getByTestId('1-inViewPort')).toHaveTextContent('true');
        expect(getByTestId('2-inViewPort')).toHaveTextContent('true');
    });

    it('should pass isSingleImage to the children', async () => {
        let filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '3'}),
            TestHelper.fakeFileInfo({id: '4'}),
        ];

        const selectImages = (f: FileInfo | FileModel | undefined) => f?.id === '1' || f?.id === '2';

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => selectImages(f)),
                nonImages: fi.filter((f) => !selectImages(f)),
            }), [fi]);
        });

        jest.mocked(isImage).mockImplementation((f) => selectImages(f));
        jest.mocked(isVideo).mockReturnValue(false);

        const {rerender, getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('1-isSingleImage')).toHaveTextContent('true');
        });
        expect(getByTestId('3-isSingleImage')).toHaveTextContent('true');
        expect(getByTestId('4-isSingleImage')).toHaveTextContent('true');

        jest.mocked(isImage).mockReturnValue(false);
        jest.mocked(isVideo).mockImplementation((f) => selectImages(f));
        rerender(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('1-isSingleImage')).toHaveTextContent('true');
        });
        expect(getByTestId('3-isSingleImage')).toHaveTextContent('true');
        expect(getByTestId('4-isSingleImage')).toHaveTextContent('true');

        filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
            TestHelper.fakeFileInfo({id: '3'}),
            TestHelper.fakeFileInfo({id: '4'}),
        ];

        jest.mocked(isImage).mockImplementation((f) => selectImages(f));
        jest.mocked(isVideo).mockReturnValue(false);

        rerender(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('1-isSingleImage')).toHaveTextContent('false');
            expect(getByTestId('2-isSingleImage')).toHaveTextContent('false');
        });
        expect(getByTestId('3-isSingleImage')).toHaveTextContent('false');
        expect(getByTestId('4-isSingleImage')).toHaveTextContent('false');

        jest.mocked(isImage).mockReturnValue(false);
        jest.mocked(isVideo).mockImplementation((f) => selectImages(f));
        rerender(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(getByTestId('1-isSingleImage')).toHaveTextContent('false');
            expect(getByTestId('2-isSingleImage')).toHaveTextContent('false');
        });
        expect(getByTestId('3-isSingleImage')).toHaveTextContent('false');
        expect(getByTestId('4-isSingleImage')).toHaveTextContent('false');
    });

    it('should trim more than 4 images and properly add the non visible images count to the last image', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
            TestHelper.fakeFileInfo({id: '3'}),
            TestHelper.fakeFileInfo({id: '4'}),
            TestHelper.fakeFileInfo({id: '5'}),
            TestHelper.fakeFileInfo({id: '6'}),
            TestHelper.fakeFileInfo({id: '7'}),
            TestHelper.fakeFileInfo({id: '8'}),
            TestHelper.fakeFileInfo({id: '9'}),
            TestHelper.fakeFileInfo({id: '10'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1' || f.id === '2' || f.id === '3' || f.id === '4' || f.id === '5'),
                nonImages: fi.filter((f) => f.id === '6' || f.id === '7' || f.id === '8' || f.id === '9' || f.id === '10'),
            }), [fi]);
        });

        const {getByTestId, queryByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );
        await waitFor(() => expect(getByTestId('1')).toBeVisible());

        expect(getByTestId('1-nonVisibleImagesCount')).toHaveTextContent('undefined');
        expect(getByTestId('2-nonVisibleImagesCount')).toHaveTextContent('undefined');
        expect(getByTestId('3-nonVisibleImagesCount')).toHaveTextContent('undefined');
        expect(getByTestId('4-nonVisibleImagesCount')).toHaveTextContent('1');
        expect(queryByTestId('5-nonVisibleImagesCount')).not.toBeVisible();
        expect(getByTestId('6-nonVisibleImagesCount')).toHaveTextContent('undefined');
        expect(getByTestId('7-nonVisibleImagesCount')).toHaveTextContent('undefined');
        expect(getByTestId('8-nonVisibleImagesCount')).toHaveTextContent('undefined');
        expect(getByTestId('9-nonVisibleImagesCount')).toHaveTextContent('undefined');
        expect(getByTestId('10-nonVisibleImagesCount')).toHaveTextContent('undefined');
    });

    it('should add gutter to the container of to all elements but the first only on image row', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
            TestHelper.fakeFileInfo({id: '3'}),
            TestHelper.fakeFileInfo({id: '4'}),
            TestHelper.fakeFileInfo({id: '5'}),
            TestHelper.fakeFileInfo({id: '6'}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1' || f.id === '2' || f.id === '3'),
                nonImages: fi.filter((f) => f.id === '4' || f.id === '5' || f.id === '6'),
            }), [fi]);
        });

        const {getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );
        await waitFor(() => expect(getByTestId('1')).toBeVisible());

        expect(getByTestId('1-file-container')).not.toHaveStyle({marginLeft: 8});
        expect(getByTestId('2-file-container')).toHaveStyle({marginLeft: 8});
        expect(getByTestId('3-file-container')).toHaveStyle({marginLeft: 8});
        expect(getByTestId('4-file-container')).not.toHaveStyle({marginLeft: 8});
        expect(getByTestId('5-file-container')).not.toHaveStyle({marginLeft: 8});
        expect(getByTestId('6-file-container')).not.toHaveStyle({marginLeft: 8});
    });

    it('should use values from PostConfig context', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1'}),
            TestHelper.fakeFileInfo({id: '2'}),
        // eslint-disable-next-line max-lines
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi.filter((f) => f.id === '1'),
                nonImages: fi.filter((f) => f.id === '2'),
            }), [fi]);
        });

        // Set context values
        mockPostConfigValue = {
            canDownloadFiles: false,
            enableSecureFilePreview: true,
        };

        const {getByTestId} = render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );
        await waitFor(() => expect(getByTestId('1')).toBeVisible());

        // Verify context values were passed to File component
        expect(getByTestId('1-canDownloadFiles')).toHaveTextContent('false');
        expect(getByTestId('1-enableSecureFilePreview')).toHaveTextContent('true');
        expect(getByTestId('2-canDownloadFiles')).toHaveTextContent('false');
        expect(getByTestId('2-enableSecureFilePreview')).toHaveTextContent('true');
    });

    it('should skip validation when files have no localPath', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: ''}),
            TestHelper.fakeFileInfo({id: '2', localPath: ''}),
        ];

        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi,
                nonImages: [],
            }), [fi]);
        });

        render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        // fileExists should not be called since no files have localPath
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(fileExists).not.toHaveBeenCalled();
    });

    it('should validate files with localPath', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: '/path/to/file1.png'}),
            TestHelper.fakeFileInfo({id: '2', localPath: '/path/to/file2.png'}),
        ];

        jest.mocked(fileExists).mockResolvedValue(true);
        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi,
                nonImages: [],
            }), [fi]);
        });

        render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            expect(fileExists).toHaveBeenCalledWith('/path/to/file1.png');
            expect(fileExists).toHaveBeenCalledWith('/path/to/file2.png');
        });
    });

    it('should clear localPath for non-existent files', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: '/valid/path.png'}),
            TestHelper.fakeFileInfo({id: '2', localPath: '/invalid/path.png'}),
        ];

        // Mock fileExists to return true for first file, false for second
        jest.mocked(fileExists).
            mockResolvedValueOnce(true).
            mockResolvedValueOnce(false);

        // Track what filesInfo is passed to useImageAttachments
        const capturedFilesInfo: FileInfo[] = [];
        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            capturedFilesInfo.push(...fi);
            return useMemo(() => ({
                images: fi,
                nonImages: [],
            }), [fi]);
        });

        render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        // Wait for validation to complete
        await waitFor(() => {
            expect(fileExists).toHaveBeenCalledTimes(2);
        });

        // After validation, useImageAttachments should receive updated filesInfo
        // where the invalid file has localPath cleared
        await waitFor(() => {
            const updatedFiles = capturedFilesInfo.slice(-2);
            expect(updatedFiles[0].localPath).toBe('/valid/path.png');
            expect(updatedFiles[1].localPath).toBe('');
        });
    });

    it('should only validate files with localPath', async () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: '/path/to/file1.png'}),
            TestHelper.fakeFileInfo({id: '2', localPath: ''}),
            TestHelper.fakeFileInfo({id: '3', localPath: '/path/to/file3.png'}),
        ];

        jest.mocked(fileExists).mockResolvedValue(true);
        jest.mocked(useImageAttachments).mockImplementation((fi) => {
            return useMemo(() => ({
                images: fi,
                nonImages: [],
            }), [fi]);
        });

        render(
            <Files
                {...getBaseProps()}
                filesInfo={filesInfo}
            />,
        );

        await waitFor(() => {
            // Should only call fileExists for files with localPath
            expect(fileExists).toHaveBeenCalledTimes(2);
            expect(fileExists).toHaveBeenCalledWith('/path/to/file1.png');
            expect(fileExists).toHaveBeenCalledWith('/path/to/file3.png');
        });
    });
});
