// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import EmojiPicker from 'app/components/emoji_picker';
import {emptyFunction} from 'app/utils/general';
import {dismissModal, setButtons} from 'app/actions/navigation';

const leftButton = {
    id: 'close-add-reaction',
    testID: 'close.add_reaction.button',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const AddReaction = (props) => {
    const {width} = useWindowDimensions();

    const close = () => {
        Keyboard.dismiss();
        dismissModal();
    };

    const handleEmojiPress = (emoji) => {
        props.onEmojiPress(emoji);
        close();
    };

    useEffect(() => {
        setButtons(props.componentId, {
            leftButtons: [{...leftButton, icon: props.closeButton}],
        });

        const listener = {
            navigationButtonPressed: ({buttonId}) => {
                if (buttonId === 'close-add-reaction') {
                    close();
                }
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, props.componentId);

        return () => {
            // Make sure to unregister the listener during cleanup
            unsubscribe.remove();
        };
    }, []);

    return (
        <View
            testID='add_reaction.screen'
            style={styles.container}
        >
            <EmojiPicker
                deviceWidth={width}
                onEmojiPress={handleEmojiPress}
            />
        </View>
    );
};

AddReaction.propTypes = {
    componentId: PropTypes.string,
    closeButton: PropTypes.object,
    onEmojiPress: PropTypes.func,
};

AddReaction.defaultProps = {
    onEmojiPress: emptyFunction,
};

export default AddReaction;
