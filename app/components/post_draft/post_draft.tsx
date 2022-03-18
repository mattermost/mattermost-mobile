// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {RefObject, useState} from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';
import {KeyboardTrackingView, KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

import Autocomplete from '@components/autocomplete';
import {View as ViewConstants} from '@constants';
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
    keyboardTracker: RefObject<KeyboardTrackingViewRef>;
}

const {
    KEYBOARD_TRACKING_OFFSET,
    KEYBOARD_TRACKING_OFFSET_MODAL_LANDSCAPE,
    KEYBOARD_TRACKING_OFFSET_MODAL_PORTRAIT,
} = ViewConstants;

function PostDraft({
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
    keyboardTracker,
}: Props) {
    const [value, setValue] = useState(message);
    const [cursorPosition, setCursorPosition] = useState(message.length);
    const [postInputTop, setPostInputTop] = useState(0);
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const isLandscape = dimensions.width > dimensions.height;

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

    let viewInitialOffsetY = isTablet ? KEYBOARD_TRACKING_OFFSET : 0;
    if (isTablet && rootId) {
        viewInitialOffsetY = isLandscape ? KEYBOARD_TRACKING_OFFSET_MODAL_LANDSCAPE : KEYBOARD_TRACKING_OFFSET_MODAL_PORTRAIT;
    }

    return (
        <>
            <KeyboardTrackingView
                accessoriesContainerID={accessoriesContainerID}
                ref={keyboardTracker}
                scrollViewNativeID={scrollViewNativeID}
                viewInitialOffsetY={viewInitialOffsetY}
            >
                {draftHandler}
            </KeyboardTrackingView>
            <View nativeID={accessoriesContainerID}>
                {autoComplete}
            </View>
        </>
    );
}

export default PostDraft;
