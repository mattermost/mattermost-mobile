// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {Screens} from '@constants';

import type {AvailableScreens} from '@typings/screens/navigation';

export const isAndroidThreadScreen = (location: AvailableScreens) => (
    Platform.OS === 'android' && location === Screens.THREAD
);

type AndroidThreadRootPostArgs = {
    location: AvailableScreens;
    postId?: string;
    rootId?: string;
    isReplyPost?: boolean;
};

export const isAndroidThreadRootPost = ({
    location,
    postId,
    rootId,
    isReplyPost,
}: AndroidThreadRootPostArgs) => {
    if (!isAndroidThreadScreen(location)) {
        return false;
    }

    if (postId !== undefined && rootId !== undefined) {
        return postId === rootId;
    }

    return !isReplyPost;
};
