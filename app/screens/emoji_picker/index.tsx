// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {DeviceEventEmitter, StyleSheet} from 'react-native';

import {Events} from '@constants';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';

import Picker from './picker';
import PickerFooter from './picker/footer';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    onEmojiPress: (emoji: string) => void;
    imageUrl?: string;
    file?: ExtractedFileInfo;
    closeButtonId: string;
};

const style = StyleSheet.create({
    contentStyle: {
        paddingTop: 14,
    },
});

const EmojiPickerScreen = ({closeButtonId, componentId, file, imageUrl, onEmojiPress}: Props) => {
    const isTablet = useIsTablet();

    const handleEmojiPress = useCallback((emoji: string) => {
        onEmojiPress(emoji);
        DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
    }, []);

    const renderContent = useCallback(() => {
        return (
            <Picker
                onEmojiPress={handleEmojiPress}
                imageUrl={imageUrl}
                file={file}
                testID='emoji_picker'
            />
        );
    }, []);

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={componentId}
            contentStyle={style.contentStyle}
            initialSnapIndex={1}
            footerComponent={isTablet ? undefined : PickerFooter}
            testID='post_options'
        />
    );
};

export default EmojiPickerScreen;
