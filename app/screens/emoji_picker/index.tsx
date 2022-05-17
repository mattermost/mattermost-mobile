// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {Keyboard} from 'react-native';
import {Navigation} from 'react-native-navigation';

import EmojiPicker from '@components/emoji_picker';
import {dismissModal, setButtons} from '@screens/navigation';

type Props = {
    componentId: string;
    onEmojiPress: (emoji: string) => void;
    closeButton: never;
};

const EmojiPickerScreen = ({closeButton, componentId, onEmojiPress}: Props) => {
    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [
                {
                    icon: closeButton,
                    id: 'close-add-reaction',
                    testID: 'close.add_reaction.button',
                },
            ],
            rightButtons: [],
        });

        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                if (buttonId === 'close-add-reaction') {
                    close();
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, []);

    const close = useCallback(() => {
        Keyboard.dismiss();
        dismissModal();
    }, []);

    const handleEmojiPress = useCallback((emoji: string) => {
        onEmojiPress(emoji);
        close();
    }, []);

    return <EmojiPicker onEmojiPress={handleEmojiPress}/>;
};

export default EmojiPickerScreen;
