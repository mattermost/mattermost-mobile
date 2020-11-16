// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    StyleSheet,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import EmojiPicker from 'app/components/emoji_picker';
import {emptyFunction} from 'app/utils/general';
import {dismissModal, setButtons} from 'app/actions/navigation';

export default class AddReaction extends PureComponent {
    static propTypes = {
        componentId: PropTypes.string,
        closeButton: PropTypes.object,
        onEmojiPress: PropTypes.func,
    };

    static defaultProps = {
        onEmojiPress: emptyFunction,
    };

    leftButton = {
        id: 'close-add-reaction',
        testID: 'close.add_reaction.button',
    };

    constructor(props) {
        super(props);

        setButtons(props.componentId, {
            leftButtons: [{...this.leftButton, icon: props.closeButton}],
        });
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'close-add-reaction') {
            this.close();
        }
    }

    close = () => {
        Keyboard.dismiss();
        dismissModal();
    };

    handleEmojiPress = (emoji) => {
        this.props.onEmojiPress(emoji);
        this.close();
    }

    render() {
        return (
            <View
                testID='add_reaction.screen'
                style={styles.container}
            >
                <EmojiPicker onEmojiPress={this.handleEmojiPress}/>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
