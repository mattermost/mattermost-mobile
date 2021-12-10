// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {DeviceEventEmitter, Platform} from 'react-native';
import {KeyboardTrackingView, KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

import {UPDATE_NATIVE_SCROLLVIEW} from '@constants/post_draft';

import Archived from './archived';
import DraftHandler from './draft_handler';
import ReadOnly from './read_only';

type Props = {
    testID?: string;
    accessoriesContainerID?: string;
    canPost: boolean;
    channelId: string;
    channelIsArchived?: boolean;
    channelIsReadOnly: boolean;
    deactivatedChannel: boolean;
    rootId?: string;
    screenId: string;
    scrollViewNativeID?: string;
}

export default function PostDraft({
    testID,
    accessoriesContainerID,
    canPost,
    channelId,
    channelIsArchived,
    channelIsReadOnly,
    deactivatedChannel,
    rootId,
    screenId,
    scrollViewNativeID,
}: Props) {
    const keyboardTracker = useRef<KeyboardTrackingViewRef>(null);
    const resetScrollViewAnimationFrame = useRef<number>();

    const updateNativeScrollView = useCallback((scrollViewNativeIDToUpdate: string) => {
        if (keyboardTracker?.current && scrollViewNativeID === scrollViewNativeIDToUpdate) {
            resetScrollViewAnimationFrame.current = requestAnimationFrame(() => {
                keyboardTracker.current?.resetScrollView(scrollViewNativeIDToUpdate);
                if (resetScrollViewAnimationFrame.current != null) {
                    cancelAnimationFrame(resetScrollViewAnimationFrame.current);
                }
                resetScrollViewAnimationFrame.current = undefined;
            });
        }
    }, [scrollViewNativeID]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(UPDATE_NATIVE_SCROLLVIEW, updateNativeScrollView);
        return () => {
            listener.remove();
            if (resetScrollViewAnimationFrame.current) {
                cancelAnimationFrame(resetScrollViewAnimationFrame.current);
            }
        };
    }, [updateNativeScrollView]);

    if (channelIsArchived || deactivatedChannel) {
        const archivedTestID = `${testID}.archived`;

        return (
            <Archived
                testID={archivedTestID}
                deactivated={deactivatedChannel}
            />
        );
    }

    if (channelIsReadOnly || !canPost) {
        const readOnlyTestID = `${testID}.read_only`;

        return (
            <ReadOnly
                testID={readOnlyTestID}
            />
        );
    }

    const draftHandler = (
        <DraftHandler
            testID={testID}
            channelId={channelId}
            rootId={rootId}
            screenId={screenId}
        />
    );

    if (Platform.OS === 'android') {
        return draftHandler;
    }

    return (
        <KeyboardTrackingView
            accessoriesContainerID={accessoriesContainerID}
            ref={keyboardTracker}
            scrollViewNativeID={scrollViewNativeID}
        >
            {draftHandler}
        </KeyboardTrackingView>
    );
}
