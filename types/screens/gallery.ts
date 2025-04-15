// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import type {Caption} from '@mattermost/calls/lib/types';
import type {GestureHandlerGestureEvent} from 'react-native-gesture-handler';
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
}

export type Context = { [key: string]: any };

export type Handler<T, TContext extends Context> = (
  event: T,
  context: TContext,
) => void;

export type onEndHandler<T, TContext extends Context> = (
  event: T,
  context: TContext,
  isCanceled: boolean,
) => void;

export type ReturnHandler<T, TContext extends Context, R> = (
  event: T,
  context: TContext,
) => R;

export interface GestureHandlers<T, TContext extends Context> {
  onInit?: Handler<T, TContext>;
  onEvent?: Handler<T, TContext>;
  shouldHandleEvent?: ReturnHandler<T, TContext, boolean>;
  shouldCancel?: ReturnHandler<T, TContext, boolean>;
  onGesture?: Handler<T, TContext>;
  beforeEach?: Handler<T, TContext>;
  afterEach?: Handler<T, TContext>;
  onStart?: Handler<T, TContext>;
  onActive?: Handler<T, TContext>;
  onEnd?: onEndHandler<T, TContext>;
  onFail?: Handler<T, TContext>;
  onCancel?: Handler<T, TContext>;
  onFinish?: (
    event: T,
    context: TContext,
    isCanceledOrFailed: boolean,
  ) => void;
}

export type OnGestureEvent<T extends GestureHandlerGestureEvent> = (
  event: T,
) => void;

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
