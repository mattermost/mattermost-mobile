// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {Keyboard} from 'react-native';

import EmojiPicker from '@components/emoji_picker';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, setButtons} from '@screens/navigation';

type Props = {
    componentId: string;
    onEmojiPress: (emoji: string) => void;
    closeButton: never;
};

const EMOJI_PICKER_BUTTON = 'close-add-reaction';

const EmojiPickerScreen = ({closeButton, componentId, onEmojiPress}: Props) => {
    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [
                {
                    icon: closeButton,
                    id: EMOJI_PICKER_BUTTON,
                    testID: 'close.emoji_picker.button',
                },
            ],
            rightButtons: [],
        });
    }, []);

    const close = () => {
        Keyboard.dismiss();
        dismissModal({componentId});
    };

    useNavButtonPressed(EMOJI_PICKER_BUTTON, componentId, close, []);

    const handleEmojiPress = useCallback((emoji: string) => {
        onEmojiPress(emoji);
        close();
    }, []);

    return (
        <EmojiPicker
            onEmojiPress={handleEmojiPress}
            testID='emoji_picker'
        />
    );
};

export default EmojiPickerScreen;
