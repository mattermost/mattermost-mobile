// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dimensions, Keyboard, Platform} from 'react-native';

import {goToScreen} from '@actions/navigation';
import {DeviceTypes} from '@constants';
import {
    IMAGE_MAX_HEIGHT,
    IMAGE_MIN_DIMENSION,
    MAX_GIF_SIZE,
    VIEWPORT_IMAGE_OFFSET,
    VIEWPORT_IMAGE_REPLY_OFFSET,
} from '@constants/image';

import {PostImage} from '@mm-redux/types/posts';
import {FileInfo} from '@mm-redux/types/files';

import {isImage} from './file';
import {Options, SharedElementTransition, StackAnimationOptions, ViewAnimationOptions} from 'react-native-navigation';

export const calculateDimensions = (height?: number, width?: number, viewPortWidth = 0, viewPortHeight = 0) => {
    if (!height || !width) {
        return {};
    }

    const ratio = height / width;
    const heightRatio = width / height;

    let imageWidth = width;
    let imageHeight = height;

    if (width > viewPortWidth) {
        imageWidth = viewPortWidth;
        imageHeight = imageWidth * ratio;
    } else if (width < IMAGE_MIN_DIMENSION) {
        imageWidth = IMAGE_MIN_DIMENSION;
        imageHeight = imageWidth * ratio;
    }

    if (
        (
            imageHeight > IMAGE_MAX_HEIGHT ||
            (viewPortHeight && imageHeight > viewPortHeight)
        ) && viewPortHeight <= IMAGE_MAX_HEIGHT
    ) {
        imageHeight = viewPortHeight || IMAGE_MAX_HEIGHT;
        imageWidth = imageHeight * heightRatio;
    } else if (
        imageHeight < IMAGE_MIN_DIMENSION &&
        IMAGE_MIN_DIMENSION * heightRatio <= viewPortWidth
    ) {
        imageHeight = IMAGE_MIN_DIMENSION;
        imageWidth = imageHeight * heightRatio;
    } else if (viewPortHeight && imageHeight > viewPortHeight) {
        imageHeight = viewPortHeight;
        imageWidth = imageHeight * heightRatio;
    }

    return {
        height: imageHeight,
        width: imageWidth,
    };
};

export function getViewPortWidth(isReplyPost: boolean, permanentSidebar = false) {
    const {width, height} = Dimensions.get('window');
    let portraitPostWidth = Math.min(width, height) - VIEWPORT_IMAGE_OFFSET;

    if (permanentSidebar) {
        portraitPostWidth -= DeviceTypes.TABLET_WIDTH;
    }

    if (isReplyPost) {
        portraitPostWidth -= VIEWPORT_IMAGE_REPLY_OFFSET;
    }

    return portraitPostWidth;
}

export function openGalleryAtIndex(index: number, files: FileInfo[]) {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
        const screen = 'Gallery';
        const passProps = {
            index,
            files,
        };
        const windowHeight = Dimensions.get('window').height;
        const sharedElementTransitions: SharedElementTransition[] = [];

        const contentPush = {} as ViewAnimationOptions;
        const contentPop = {} as ViewAnimationOptions;
        const file = files[index];

        if (isImage(file)) {
            sharedElementTransitions.push({
                fromId: `image-${file.id}`,
                toId: `gallery-${file.id}`,
                duration: 300,
                interpolation: {type: 'accelerateDecelerate'},
            });
        } else {
            contentPush.y = {
                from: windowHeight,
                to: 0,
                duration: 300,
                interpolation: {type: 'decelerate'},
            };

            if (Platform.OS === 'ios') {
                contentPop.translationY = {
                    from: 0,
                    to: windowHeight,
                    duration: 300,
                };
            } else {
                contentPop.y = {
                    from: 0,
                    to: windowHeight,
                    duration: 300,
                };
                contentPop.alpha = {
                    from: 1,
                    to: 0,
                    duration: 100,
                };
            }
        }

        const options: Options = {
            layout: {
                backgroundColor: '#000',
                componentBackgroundColor: '#000',
                orientation: ['portrait', 'landscape'],
            },
            topBar: {
                background: {
                    color: '#000',
                },
                visible: Platform.OS === 'android',
            },
            animations: {
                push: {
                    waitForRender: true,
                    sharedElementTransitions,
                },
            },
        };

        if (Object.keys(contentPush).length) {
            options.animations!.push = {
                ...options.animations!.push,
                ...Platform.select<ViewAnimationOptions | StackAnimationOptions>({
                    android: contentPush,
                    ios: {
                        content: contentPush,
                    },
                }),
            };
        }

        if (Object.keys(contentPop).length) {
            options.animations!.pop = Platform.select<ViewAnimationOptions | StackAnimationOptions>({
                android: contentPop,
                ios: {
                    content: contentPop,
                },
            });
        }

        goToScreen(screen, '', passProps, options);
    });
}

// isGifTooLarge returns true if we think that the GIF may cause the device to run out of memory when rendered
// based on the image's dimensions and frame count.
export function isGifTooLarge(imageMetadata?: PostImage) {
    if (imageMetadata?.format !== 'gif') {
        // Not a gif or from an older server that doesn't count frames
        return false;
    }

    const {frame_count: frameCount, height, width} = imageMetadata;

    // Try to estimate the in-memory size of the gif to prevent the device out of memory
    return width * height * (frameCount || 1) > MAX_GIF_SIZE;
}
