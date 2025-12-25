// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {DeviceEventEmitter, StyleSheet} from 'react-native';

import {Events, Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import EmojiPickerStore from '@store/emoji_picker_store';

import Picker from './picker';
import PickerFooter from './picker/footer';

export type EmojiPickerProps = {
    imageUrl?: string;
    file?: ExtractedFileInfo;
};

const style = StyleSheet.create({
    contentStyle: {
        paddingTop: 14,
    },
});

const EmojiPickerScreen = ({file, imageUrl}: EmojiPickerProps) => {
    const isTablet = useIsTablet();

    const handleEmojiPress = useCallback((emoji: string) => {
        const callback = EmojiPickerStore.getEmojiPickerCallback();
        if (callback) {
            callback(emoji);
        }
        DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
        EmojiPickerStore.clearEmojiPickerCallback();
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
    }, [file, handleEmojiPress, imageUrl]);

    return (
        <BottomSheet
            renderContent={renderContent}
            screen={Screens.EMOJI_PICKER}
            contentStyle={style.contentStyle}
            initialSnapIndex={1}
            footerComponent={isTablet ? undefined : PickerFooter}
            testID='post_options'
        />
    );
};

export default EmojiPickerScreen;
