// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import BottomSheet from '@screens/bottom_sheet';

import Picker from './picker';
import EmojiSectionBar from './picker/footer';

type Props = {
    componentId: string;
    onEmojiPress: (emoji: string) => void;
    closeButtonId: string;
};

const EmojiPickerScreen = ({closeButtonId, componentId, onEmojiPress}: Props) => {
    const handleEmojiPress = useCallback((emoji: string) => {
        onEmojiPress(emoji);
        DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
    }, []);

    const renderContent = useCallback(() => {
        return (
            <Picker
                onEmojiPress={handleEmojiPress}
                testID='emoji_picker'
            />
        );
    }, []);

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={componentId}
            contentStyle={{paddingTop: 14}}
            initialSnapIndex={1}
            footerComponent={EmojiSectionBar}
            testID='post_options'
        />
    );
};

export default EmojiPickerScreen;
