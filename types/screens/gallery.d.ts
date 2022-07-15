// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type GalleryManagerSharedValues = {
    width: Animated.SharedValue<number>;
    height: Animated.SharedValue<number>;
    x: Animated.SharedValue<number>;
    y: Animated.SharedValue<number>;
    opacity: Animated.SharedValue<number>;
    activeIndex: Animated.SharedValue<number>;
    targetWidth: Animated.SharedValue<number>;
    targetHeight: Animated.SharedValue<number>;
}

type Context = { [key: string]: any };

type Handler<T, TContext extends Context> = (
  event: T,
  context: TContext,
) => void;

type onEndHandler<T, TContext extends Context> = (
  event: T,
  context: TContext,
  isCanceled: boolean,
) => void;

type ReturnHandler<T, TContext extends Context, R> = (
  event: T,
  context: TContext,
) => R;

interface GestureHandlers<T, TContext extends Context> {
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

type OnGestureEvent<T extends GestureHandlerGestureEvent> = (
  event: T,
) => void;

type GalleryItemType = {
    type: 'image' | 'video' | 'file' | 'avatar';
    id: string;
    width: number;
    height: number;
    uri: string;
    name: string;
    posterUri?: string;
    extension?: string;
    mime_type: string;
    authorId?: string;
    size?: number;
    postId?: string;
};

type GalleryAction = 'none' | 'downloading' | 'copying' | 'sharing' | 'opening' | 'external';
