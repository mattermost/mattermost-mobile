// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useLayoutEffect} from 'react';
import Animated, {makeMutable, runOnUI, type AnimatedRef} from 'react-native-reanimated';

import type {GalleryManagerSharedValues} from '@typings/screens/gallery';

export interface GalleryManagerItem {
    index: number;
    ref: AnimatedRef<any>;
}

export interface GalleryManagerItems {
    [index: number]: GalleryManagerItem;
}

interface GalleryInitProps {
    children: JSX.Element;
    galleryIdentifier: string;
}

class Gallery {
    private init = false;
    private timeout: NodeJS.Timeout | null = null;

    public refsByIndexSV: Animated.SharedValue<GalleryManagerItems> = makeMutable({});

    public sharedValues: GalleryManagerSharedValues = {
        width: makeMutable(0),
        height: makeMutable(0),
        x: makeMutable(0),
        y: makeMutable(0),
        opacity: makeMutable(1),
        activeIndex: makeMutable(0),
        targetWidth: makeMutable(0),
        targetHeight: makeMutable(0),
    };

    public items = new Map<number, GalleryManagerItem>();

    public get isInitialized() {
        return this.init;
    }

    public resolveItem(index: number) {
        return this.items.get(index);
    }

    public initialize() {
        this.init = true;
    }

    public reset() {
        this.init = false;
        this.items.clear();
        this.refsByIndexSV.value = {};
    }

    public resetSharedValues() {
        const {
            width,
            height,
            opacity,
            activeIndex,
            x,
            y,
        } = this.sharedValues;

        runOnUI(() => {
            'worklet';

            width.value = 0;
            height.value = 0;
            opacity.value = 1;
            activeIndex.value = -1;
            x.value = 0;
            y.value = 0;
        })();
    }

    public registerItem(index: number, ref: AnimatedRef<any>) {
        if (this.items.has(index)) {
            return;
        }

        this.addItem(index, ref);
    }

    private addItem(index: number, ref: GalleryManagerItem['ref']) {
        this.items.set(index, {
            index,
            ref,
        });

        if (this.timeout !== null) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => {
            this.refsByIndexSV.value = this.convertMapToObject(this.items);

            this.timeout = null;
        }, 16);
    }

    private convertMapToObject<T extends Map<string | number, GalleryManagerItem>>(map: T) {
        const obj: Record<string, GalleryManagerItem> = {};
        for (const [key, value] of map) {
            obj[key] = value;
        }
        return obj;
    }
}

class GalleryManager {
    private galleries: Record<string, Gallery> = {};

    public get(identifier: string): Gallery {
        if (this.galleries[identifier]) {
            return this.galleries[identifier];
        }

        const gallery = new Gallery();
        this.galleries[identifier] = gallery;
        return gallery;
    }

    public remove(identifier: string): boolean {
        return delete this.galleries[identifier];
    }
}

const galleryManager = new GalleryManager();

export function useGallery(galleryIdentifier: string) {
    const gallery = galleryManager.get(galleryIdentifier);

    if (!gallery) {
        throw new Error(
            'Cannot retrieve gallery manager from the context. Did you forget to wrap the app with GalleryProvider?',
        );
    }

    return gallery;
}

export function GalleryInit({children, galleryIdentifier}: GalleryInitProps) {
    const gallery = useGallery(galleryIdentifier);

    useLayoutEffect(() => {
        gallery.initialize();

        return () => {
            gallery.reset();
        };
    }, []);

    useEffect(() => {
        return () => {
            galleryManager.remove(galleryIdentifier);
        };
    }, []);

    return children;
}
