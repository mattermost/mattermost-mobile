// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter, Keyboard, NativeModules, Platform} from 'react-native';
import {Navigation, type Options, type OptionsLayout} from 'react-native-navigation';
import {measure, type AnimatedRef} from 'react-native-reanimated';

import {Events, Screens} from '@constants';
import {allOrientations, showOverlay} from '@screens/navigation';
import {isImage, isVideo} from '@utils/file';
import {generateId} from '@utils/general';

import type {GalleryItemType, GalleryManagerSharedValues} from '@typings/screens/gallery';

export const clamp = (value: number, lowerBound: number, upperBound: number) => {
    'worklet';

    return Math.min(Math.max(lowerBound, value), upperBound);
};

export const clampVelocity = (velocity: number, minVelocity: number, maxVelocity: number) => {
    'worklet';

    if (velocity > 0) {
        return Math.min(Math.max(velocity, minVelocity), maxVelocity);
    }
    return Math.max(Math.min(velocity, -minVelocity), -maxVelocity);
};

export const fileToGalleryItem = (file: FileInfo, authorId?: string, postProps?: Record<string, any>, lastPictureUpdate = 0): GalleryItemType => {
    let type: GalleryItemType['type'] = 'file';
    if (isVideo(file)) {
        type = 'video';
    } else if (isImage(file)) {
        type = 'image';
    }

    return {
        authorId,
        extension: file.extension,
        height: file.height,
        id: file.id || generateId('uid'),
        lastPictureUpdate,
        mime_type: file.mime_type,
        name: file.name,
        posterUri: type === 'video' ? file.mini_preview : undefined, // set the video poster to the mini_preview
        postId: file.post_id,
        size: file.size,
        type,
        uri: file.localPath || file.uri || '',
        width: file.width,
        postProps: postProps || file.postProps,
    };
};

export const freezeOtherScreens = (value: boolean) => {
    DeviceEventEmitter.emit(Events.FREEZE_SCREEN, value);
};

export const friction = (value: number) => {
    'worklet';

    const MAX_FRICTION = 30;
    const MAX_VALUE = 200;

    const res = Math.max(
        1,
        Math.min(
            MAX_FRICTION,
            (1 + (Math.abs(value) * (MAX_FRICTION - 1))) / MAX_VALUE,
        ),
    );

    return value > 0 ? res : -res;
};

export const galleryItemToFileInfo = (item: GalleryItemType): FileInfo => ({
    id: item.id,
    name: item.name,
    create_at: 0,
    delete_at: 0,
    update_at: 0,
    width: item.width,
    height: item.height,
    extension: item.extension || '',
    mime_type: item.mime_type,
    has_preview_image: false,
    post_id: item.postId!,
    size: 0,
    user_id: item.authorId!,
});

export const getShouldRender = (index: number, activeIndex: number, diffValue = 3) => {
    const diff = Math.abs(index - activeIndex);

    if (diff > diffValue) {
        return false;
    }

    return true;
};

export function measureItem(ref: AnimatedRef<any>, sharedValues: GalleryManagerSharedValues) {
    'worklet';

    try {
        const measurements = measure(ref);

        sharedValues.x.value = measurements?.pageX || 999999;
        sharedValues.y.value = measurements?.pageY || 999999;
        sharedValues.width.value = measurements?.width || 0;
        sharedValues.height.value = measurements?.height || 0;
    } catch (err) {
        sharedValues.x.value = 999999;
        sharedValues.y.value = 999999;
        sharedValues.width.value = 0;
        sharedValues.height.value = 0;
    }
}

export function openGalleryAtIndex(galleryIdentifier: string, initialIndex: number, items: GalleryItemType[], hideActions = false) {
    Keyboard.dismiss();
    const props = {
        galleryIdentifier,
        hideActions,
        initialIndex,
        items,
    };
    const layout: OptionsLayout = {
        orientation: allOrientations,
    };
    const options: Options = {
        layout,
        topBar: {
            background: {
                color: '#000',
            },
            visible: Platform.OS === 'android',
        },
        statusBar: {
            backgroundColor: '#000',
            style: 'light',
        },
        animations: {
            showModal: {
                waitForRender: false,
                enabled: false,
            },
            dismissModal: {
                enabled: false,
            },
        },
    };

    if (Platform.OS === 'ios') {
        // on iOS we need both the navigation & the module
        Navigation.setDefaultOptions({layout});
        NativeModules.SplitView.unlockOrientation();
    }
    showOverlay(Screens.GALLERY, props, options);

    setTimeout(() => {
        freezeOtherScreens(true);
    }, 500);
}

export const typedMemo: <T>(c: T) => T = React.memo;

export const workletNoop = () => {
    'worklet';
};

export const workletNoopTrue = () => {
    'worklet';

    return true;
};
