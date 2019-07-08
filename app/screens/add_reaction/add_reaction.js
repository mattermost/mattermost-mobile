// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import EmojiPicker from 'app/components/emoji_picker';
import {emptyFunction} from 'app/utils/general';
import {setNavigatorStyles} from 'app/utils/theme';

export default class AddReaction extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            dismissModal: PropTypes.func.isRequired,
            setButtons: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        closeButton: PropTypes.object,
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

        props.actions.setButtons(props.componentId, {
            leftButtons: [{...this.leftButton, icon: props.closeButton}],
        });
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
        }
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'close-edit-post') {
            this.close();
        }
    }

    close = () => {
        this.props.actions.dismissModal();
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
