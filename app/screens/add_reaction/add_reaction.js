// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
} from 'react-native';

import EmojiPicker from 'app/components/emoji_picker';
import {emptyFunction} from 'app/utils/general';
import {setNavigatorStyles} from 'app/utils/theme';

export default class AddReaction extends PureComponent {
    static propTypes = {
        closeButton: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        onEmojiPress: PropTypes.func,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onEmojiPress: emptyFunction,
    };

    leftButton = {
        id: 'close-edit-post',
    };

    constructor(props) {
        super(props);

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons({
            leftButtons: [{...this.leftButton, icon: props.closeButton}],
        });
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down',
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-edit-post':
                this.close();
                break;
            }
        }
    };

    handleEmojiPress = (emoji) => {
        this.props.onEmojiPress(emoji);
        this.close();
    }

    render() {
        return (
            <View style={styles.container}>
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
