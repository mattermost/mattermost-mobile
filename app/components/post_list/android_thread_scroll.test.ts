// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {Screens} from '@constants';

import {isAndroidThreadRootPost, isAndroidThreadScreen} from './android_thread_scroll';

describe('android_thread_scroll', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
        Object.defineProperty(Platform, 'OS', {value: originalOS});
    });

    it('should identify Android thread screens only', () => {
        Object.defineProperty(Platform, 'OS', {value: 'android'});
        expect(isAndroidThreadScreen(Screens.THREAD)).toBe(true);
        expect(isAndroidThreadScreen(Screens.CHANNEL)).toBe(false);

        Object.defineProperty(Platform, 'OS', {value: 'ios'});
        expect(isAndroidThreadScreen(Screens.THREAD)).toBe(false);
    });

    it('should identify Android thread root posts by root id or reply state', () => {
        Object.defineProperty(Platform, 'OS', {value: 'android'});

        expect(isAndroidThreadRootPost({
            location: Screens.THREAD,
            postId: 'root-post-id',
            rootId: 'root-post-id',
        })).toBe(true);

        expect(isAndroidThreadRootPost({
            location: Screens.THREAD,
            postId: 'reply-post-id',
            rootId: 'root-post-id',
        })).toBe(false);

        expect(isAndroidThreadRootPost({
            location: Screens.THREAD,
            isReplyPost: false,
        })).toBe(true);

        expect(isAndroidThreadRootPost({
            location: Screens.THREAD,
            isReplyPost: true,
        })).toBe(false);
    });
});
