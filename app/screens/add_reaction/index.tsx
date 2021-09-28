// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, useWindowDimensions, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import EmojiPicker from '@components/emoji_picker';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {dismissModal, setButtons} from '@screens/navigation';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

type AddReactionProps = {
    componentId: string;
    onEmojiPress: (emoji: string) => void;
    closeButton: never;
};

const AddReaction = ({closeButton, componentId, onEmojiPress}: AddReactionProps) => {
    const {height, width} = useWindowDimensions();

    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [
                {
                    icon: closeButton,
                    id: 'close-add-reaction',
                    testID: 'close.add_reaction.button',
                },
            ] as unknown as never[],
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

    return (
        <View
            testID='add_reaction.screen'
            style={styles.container}
        >
            <EmojiPicker
                isLandscape={width > height}
                deviceWidth={width}
                intl={intl}
                onEmojiPress={handleEmojiPress}
                serverUrl={serverUrl}
                testID='add_reaction.emoji_picker'
                theme={theme}
            />
        </View>
    );
};

export default AddReaction;
