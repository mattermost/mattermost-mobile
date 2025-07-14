// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Image, Keyboard} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {measure, type AnimatedRef} from 'react-native-reanimated';

import {clamp, clampVelocity, fileToGalleryItem, freezeOtherScreens, friction, galleryItemToFileInfo, getImageSize, getShouldRender, measureItem, openGalleryAtIndex, typedMemo, workletNoop, workletNoopTrue} from '.';

import type {GalleryItemType, GalleryManagerSharedValues} from '@typings/screens/gallery';

jest.mock('@screens/navigation', () => ({
    showOverlay: jest.fn(),
}));

// Mock react-native-reanimated measure function
jest.mock('react-native-reanimated', () => ({
    measure: jest.fn(() => ({
        pageX: 100,
        pageY: 200,
        width: 300,
        height: 400,
    })),
}));

describe('Gallery utils', () => {
    afterAll(() => {
        jest.clearAllMocks();
    });

    describe('clamp', () => {
        it('should clamp a value within the given bounds', () => {
            expect(clamp(5, 1, 10)).toBe(5);
            expect(clamp(-5, 0, 10)).toBe(0);
            expect(clamp(15, 0, 10)).toBe(10);
        });
    });

    describe('clampVelocity', () => {
        it('should clamp positive velocity within the given bounds', () => {
            expect(clampVelocity(5, 1, 10)).toBe(5);
            expect(clampVelocity(0.5, 1, 10)).toBe(1);
            expect(clampVelocity(15, 1, 10)).toBe(10);
        });

        it('should clamp negative velocity within the given bounds', () => {
            expect(clampVelocity(-5, 1, 10)).toBe(-5);
            expect(clampVelocity(-0.5, 1, 10)).toBe(-1);
            expect(clampVelocity(-15, 1, 10)).toBe(-10);
        });
    });

    describe('fileToGalleryItem', () => {
        it('should convert file info to gallery item with image type', () => {
            const file = {
                extension: 'jpg',
                height: 600,
                id: '123',
                mime_type: 'image/jpeg',
                name: 'test-image',
                post_id: 'post123',
                size: 5000,
                localPath: '/path/to/image.jpg',
                width: 800,
            } as FileInfo;
            const result = fileToGalleryItem(file);
            expect(result.type).toBe('image');
            expect(result.uri).toBe(file.localPath);
        });

        it('should convert file info to gallery item with video type', () => {
            const file = {
                extension: 'mp4',
                height: 600,
                id: '123',
                mime_type: 'video/mp4',
                name: 'test-video',
                post_id: 'post123',
                size: 10000,
                localPath: '/path/to/video.mp4',
                mini_preview: '/path/to/preview.jpg',
                width: 800,
            } as FileInfo;
            const result = fileToGalleryItem(file);
            expect(result.type).toBe('video');
            expect(result.posterUri).toBe(file.mini_preview);
        });

        it('should convert file info to gallery item with video type and assign a file id that starts with uid', () => {
            const file = {
                extension: 'mp4',
                height: 600,
                mime_type: 'video/mp4',
                name: 'test-video',
                post_id: 'post123',
                size: 10000,
                localPath: '/path/to/video.mp4',
                mini_preview: '/path/to/preview.jpg',
                width: 800,
            } as FileInfo;
            const result = fileToGalleryItem(file);
            expect(result.id.startsWith('uid')).toBeTruthy();
        });
    });

    describe('freezeOtherScreens', () => {
        it('should emit freeze screen event', () => {
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            freezeOtherScreens(true);
            expect(emitSpy).toHaveBeenCalledWith('FREEZE_SCREEN', true);
        });
    });

    describe('friction', () => {
        it('should calculate friction based on value', () => {
            expect(friction(100)).toBeGreaterThan(1);
            expect(friction(-100)).toBeLessThan(0);
        });
    });

    describe('galleryItemToFileInfo', () => {
        it('should convert gallery item to file info', () => {
            const item = {
                id: '123',
                name: 'test-image',
                width: 800,
                height: 600,
                extension: 'jpg',
                mime_type: 'image/jpeg',
                postId: 'post123',
                authorId: 'user123',
            } as GalleryItemType;
            const result = galleryItemToFileInfo(item);
            expect(result.id).toBe(item.id);
            expect(result.name).toBe(item.name);
        });
    });

    describe('getShouldRender', () => {
        it('should return true if index is within range of active index', () => {
            expect(getShouldRender(5, 5)).toBe(true);
            expect(getShouldRender(6, 5)).toBe(true);
            expect(getShouldRender(9, 5)).toBe(false);
        });
    });

    describe('measureItem', () => {
        it('should measure and set shared values', () => {
            const ref = jest.fn() as unknown as AnimatedRef<any>;
            const sharedValues = {
                x: {value: 0},
                y: {value: 0},
                width: {value: 0},
                height: {value: 0},
            } as GalleryManagerSharedValues;
            measureItem(ref, sharedValues);
            expect(sharedValues.x.value).toBe(100);
            expect(sharedValues.y.value).toBe(200);
        });

        it('should measure and set shared values', () => {
            const ref = jest.fn() as unknown as AnimatedRef<any>;
            const sharedValues = {
                x: {value: 0},
                y: {value: 0},
                width: {value: 0},
                height: {value: 0},
            } as GalleryManagerSharedValues;
            measureItem(ref, sharedValues);
            expect(sharedValues.x.value).toBe(100);
            expect(sharedValues.y.value).toBe(200);
        });

        it('should handle measure exception and set shared values out of the viewport', () => {
            const ref = jest.fn() as unknown as AnimatedRef<any>;
            const sharedValues = {
                x: {value: 0},
                y: {value: 0},
                width: {value: 0},
                height: {value: 0},
            } as GalleryManagerSharedValues;
            (measure as jest.Mock).mockImplementationOnce(() => {
                throw new Error('error');
            });
            measureItem(ref, sharedValues);
            expect(sharedValues.x.value).toBe(999999);
            expect(sharedValues.y.value).toBe(999999);
        });
    });

    describe('openGalleryAtIndex', () => {
        it('should open gallery and freeze other screens', () => {
            const galleryIdentifier = 'gallery1';
            const initialIndex = 0;
            const items = [{id: '1', name: 'item1'}, {id: '2', name: 'item2'}] as GalleryItemType[];

            openGalleryAtIndex(galleryIdentifier, initialIndex, items);
            expect(Keyboard.dismiss).toHaveBeenCalled();
            expect(Navigation.setDefaultOptions).toHaveBeenCalled();
        });
    });

    describe('typedMemo', () => {
        it('should memoize component', () => {
            const component = jest.fn();
            const memoizedComponent = typedMemo(component);

            // @ts-expect-error type in typedef
            expect(memoizedComponent.type).toBe(component);
        });
    });

    describe('workletNoop', () => {
        it('should execute without doing anything', () => {
            expect(workletNoop()).toBeUndefined();
        });
    });

    describe('workletNoopTrue', () => {
        it('should always return true', () => {
            expect(workletNoopTrue()).toBe(true);
        });
    });

    describe('getImageSize', () => {
        it('should resolve with image size', async () => {
            jest.spyOn(Image, 'getSize').mockImplementationOnce((uri, success) => {
                success(800, 600);
            });

            const result = await getImageSize('test-uri');
            expect(result).toEqual({width: 800, height: 600});
        });

        it('should reject on error', async () => {
            jest.spyOn(Image, 'getSize').mockImplementationOnce((uri, success, failure) => {
                // @ts-expect-error param
                failure(new Error('Failed to get size'));
            });

            await expect(getImageSize('test-uri')).rejects.toThrow('Failed to get size');
        });
    });
});
