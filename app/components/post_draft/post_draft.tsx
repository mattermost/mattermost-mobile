// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type RefObject, useEffect, useState} from 'react';
import {Platform} from 'react-native';
import {KeyboardTrackingView, type KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Autocomplete from '@components/autocomplete';
import {View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
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
    canShowPostPriority?: boolean;
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
    canShowPostPriority,
}: Props) {
    const [value, setValue] = useState(message);
    const [cursorPosition, setCursorPosition] = useState(message.length);
    const [postInputTop, setPostInputTop] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight(keyboardTracker);
    const insets = useSafeAreaInsets();
    const headerHeight = useDefaultHeaderHeight();
    const serverUrl = useServerUrl();

    // Update draft in case we switch channels or threads
    useEffect(() => {
        setValue(message);
        setCursorPosition(message.length);
    }, [channelId, rootId]);

    const keyboardAdjustment = (isTablet && isChannelScreen) ? KEYBOARD_TRACKING_OFFSET : 0;
    const insetsAdjustment = (isTablet && isChannelScreen) ? 0 : insets.bottom;
    const autocompletePosition = AUTOCOMPLETE_ADJUST + Platform.select({
        ios: (keyboardHeight ? keyboardHeight - keyboardAdjustment : (postInputTop + insetsAdjustment)),
        default: postInputTop + insetsAdjustment,
    });
    const autocompleteAvailableSpace = containerHeight - autocompletePosition - (isChannelScreen ? headerHeight : 0);

    const [animatedAutocompletePosition, animatedAutocompleteAvailableSpace] = useAutocompleteDefaultAnimatedValues(autocompletePosition, autocompleteAvailableSpace);

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
            canShowPostPriority={canShowPostPriority}
            updateCursorPosition={setCursorPosition}
            updatePostInputTop={setPostInputTop}
            updateValue={setValue}
            value={value}
            setIsFocused={setIsFocused}
        />
    );

    const autoComplete = isFocused ? (
        <Autocomplete
            position={animatedAutocompletePosition}
            updateValue={setValue}
            rootId={rootId}
            channelId={channelId}
            cursorPosition={cursorPosition}
            value={value}
            isSearch={isSearch}
            hasFilesAttached={Boolean(files?.length)}
            inPost={true}
            availableSpace={animatedAutocompleteAvailableSpace}
            serverUrl={serverUrl}
        />
    ) : null;

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
            {autoComplete}
        </>
    );
}

export default PostDraft;
