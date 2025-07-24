// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Caption} from '@mattermost/calls/lib/types';
import type {PanGesture, TapGesture} from 'react-native-gesture-handler';
import type {SharedValue} from 'react-native-reanimated';

export type GalleryManagerSharedValues = {
    width: SharedValue<number>;
    height: SharedValue<number>;
    x: SharedValue<number>;
    y: SharedValue<number>;
    opacity: SharedValue<number>;
    activeIndex: SharedValue<number>;
    targetWidth: SharedValue<number>;
    targetHeight: SharedValue<number>;
    scale: SharedValue<number>;
}

export type GalleryFileType = 'image' | 'video' | 'file' | 'avatar';

export type GalleryItemType = {
    type: GalleryFileType;
    id: string;
    width: number;
    height: number;
    uri: string;
    lastPictureUpdate: number;
    name: string;
    posterUri?: string;
    extension?: string;
    mime_type: string;
    authorId?: string;
    size?: number;
    postId?: string;
    postProps?: Record<string, unknown> & {captions?: Caption[]};
};

export type GalleryAction = 'none' | 'downloading' | 'copying' | 'sharing' | 'opening' | 'external';

export type GalleryPagerItem = {
    index: number;
    onPageStateChange: (value: boolean) => void;
    item: GalleryItemType;
    width: number;
    height: number;
    isPageActive?: SharedValue<boolean>;
    isPagerInProgress: SharedValue<boolean>;
    pagerPanGesture: PanGesture;
    pagerTapGesture: TapGesture;
    lightboxPanGesture: PanGesture;
};
