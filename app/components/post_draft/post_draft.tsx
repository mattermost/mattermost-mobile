// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {RefObject, useEffect, useState} from 'react';
import {Platform, View} from 'react-native';
import {KeyboardTrackingView, KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Autocomplete from '@components/autocomplete';
import {View as ViewConstants} from '@constants';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';

import Archived from './archived';
import DraftHandler from './draft_handler';
import ReadOnly from './read_only';

const AUTOCOMPLETE_ADJUST = -5;
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
    containerHeight: number;
    isChannelScreen: boolean;
}

const {KEYBOARD_TRACKING_OFFSET} = ViewConstants;

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
    containerHeight,
    isChannelScreen,
}: Props) {
    const [value, setValue] = useState(message);
    const [cursorPosition, setCursorPosition] = useState(message.length);
    const [postInputTop, setPostInputTop] = useState(0);
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight(keyboardTracker);
    const insets = useSafeAreaInsets();
    const headerHeight = useDefaultHeaderHeight();

    // Update draft in case we switch channels or threads
    useEffect(() => {
        setValue(message);
        setCursorPosition(message.length);
    }, [channelId, rootId]);

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

    const keyboardAdjustment = (isTablet && isChannelScreen) ? KEYBOARD_TRACKING_OFFSET : 0;
    const insetsAdjustment = (isTablet && isChannelScreen) ? 0 : insets.bottom;
    const autocompletePosition = AUTOCOMPLETE_ADJUST + Platform.select({
        ios: (keyboardHeight ? keyboardHeight - keyboardAdjustment : (postInputTop + insetsAdjustment)),
        default: postInputTop + insetsAdjustment,
    });
    const autocompleteAvailableSpace = containerHeight - autocompletePosition - (isChannelScreen ? headerHeight + insets.top : 0);

    const autoComplete = (
        <Autocomplete
            position={autocompletePosition}
            updateValue={setValue}
            rootId={rootId}
            channelId={channelId}
            cursorPosition={cursorPosition}
            value={value}
            isSearch={isSearch}
            hasFilesAttached={Boolean(files?.length)}
            inPost={true}
            availableSpace={autocompleteAvailableSpace}
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
                viewInitialOffsetY={isTablet && !rootId ? KEYBOARD_TRACKING_OFFSET : 0}
            >
                {draftHandler}
            </KeyboardTrackingView>
            <View>
                {autoComplete}
            </View>
        </>
    );
}

export default PostDraft;
