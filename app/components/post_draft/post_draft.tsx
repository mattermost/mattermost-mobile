// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, View} from 'react-native';
import {KeyboardTrackingView, KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

import Autocomplete from '@components/autocomplete';
import {PostDraft as PostDraftConstants, View as ViewConstants} from '@constants';
import {useIsTablet} from '@hooks/device';

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
    files?: FileInfo[];
    isSearch?: boolean;
    message?: string;
    rootId?: string;
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
    files,
    isSearch,
    message = '',
    rootId = '',
    scrollViewNativeID,
}: Props) {
    const keyboardTracker = useRef<KeyboardTrackingViewRef>(null);
    const resetScrollViewAnimationFrame = useRef<number>();
    const [value, setValue] = useState(message);
    const [cursorPosition, setCursorPosition] = useState(message.length);
    const [postInputTop, setPostInputTop] = useState(0);
    const isTablet = useIsTablet();

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
        const listener = DeviceEventEmitter.addListener(PostDraftConstants.UPDATE_NATIVE_SCROLLVIEW, updateNativeScrollView);
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
            cursorPosition={cursorPosition}
            files={files}
            rootId={rootId}
            updateCursorPosition={setCursorPosition}
            updatePostInputTop={setPostInputTop}
            updateValue={setValue}
            value={value}
        />
    );

    const autoComplete = (
        <Autocomplete
            postInputTop={postInputTop}
            updateValue={setValue}
            rootId={rootId}
            channelId={channelId}
            cursorPosition={cursorPosition}
            value={value}
            isSearch={isSearch}
            hasFilesAttached={Boolean(files?.length)}
        />
    );

    if (Platform.OS === 'android') {
        return (
            <>
                {draftHandler}
                {autoComplete}
            </>
        );
    }

    return (
        <>
            <KeyboardTrackingView
                accessoriesContainerID={accessoriesContainerID}
                ref={keyboardTracker}
                scrollViewNativeID={scrollViewNativeID}
                viewInitialOffsetY={isTablet ? ViewConstants.BOTTOM_TAB_HEIGHT : 0}
            >
                {draftHandler}
            </KeyboardTrackingView>
            <View nativeID={accessoriesContainerID}>
                {autoComplete}
            </View>
        </>
    );
}
