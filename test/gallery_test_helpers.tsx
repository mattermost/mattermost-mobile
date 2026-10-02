// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {makeMutable, type SharedValue} from 'react-native-reanimated';

import {LightboxProvider, type LightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';

import type {GalleryItemType} from '@typings/screens/gallery';

export const buildLightboxValues = (overrides: Partial<LightboxSharedValues> = {}): LightboxSharedValues => ({
    headerAndFooterHidden: makeMutable(false),
    animationProgress: makeMutable(0),
    childrenOpacity: makeMutable(1),
    childTranslateY: makeMutable(0),
    imageOpacity: makeMutable(1),
    opacity: makeMutable(1),
    scale: makeMutable(1),
    target: buildGalleryItem(),
    targetDimensions: {width: 320, height: 180},
    translateX: makeMutable(0),
    translateY: makeMutable(0),
    allowsOtherGestures: () => false,
    isVisibleImage: () => true,
    onAnimationFinished: jest.fn(),
    onSwipeActive: jest.fn(),
    onSwipeFailure: jest.fn(),
    ...overrides,
});

export function buildGalleryItem(overrides: Partial<GalleryItemType> = {}): GalleryItemType {
    return {
        type: 'video',
        id: 'file-id-1',
        width: 1280,
        height: 720,
        uri: 'http://localhost:8065/api/v4/files/file-id-1',
        lastPictureUpdate: 0,
        name: 'video.mp4',
        posterUri: 'http://localhost:8065/api/v4/files/file-id-1/thumbnail',
        mime_type: 'video/mp4',
        cacheKey: 'cache-key-1',
        ...overrides,
    };
}

export const captionPostProps = (fileId = 'caption-file-id') => ({
    captions: [{
        title: 'English',
        language: 'en',
        file_id: fileId,
    }],
});

export const LightboxWrapper = ({children, sharedValues}: {children: React.ReactNode; sharedValues?: LightboxSharedValues}) => (
    <LightboxProvider sharedValues={sharedValues ?? buildLightboxValues()}>
        {children}
    </LightboxProvider>
);

export const sharedNumber = (value: number): SharedValue<number> => makeMutable(value);
export const sharedBoolean = (value: boolean): SharedValue<boolean> => makeMutable(value);
