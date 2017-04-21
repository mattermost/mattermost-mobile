// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, Component} from 'react';
import {
    StyleSheet,
    View
} from 'react-native';

import AtMention from './at_mention';
import ChannelMention from './channel_mention';

const style = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: 200,
        overflow: 'hidden'
    }
});

export default class Autocomplete extends Component {
    static propTypes = {
        onChangeText: PropTypes.func.isRequired,
        rootId: PropTypes.string
    };

    state = {
        cursorPosition: 0
    };

    handleSelectionChange = (event) => {
        this.setState({
            cursorPosition: event.nativeEvent.selection.end
        });
    };

    render() {
        return (
            <View>
                <View style={style.container}>
                    <AtMention
                        cursorPosition={this.state.cursorPosition}
                        onChangeText={this.props.onChangeText}
                        rootId={this.props.rootId}
                    />
                    <ChannelMention
                        cursorPosition={this.state.cursorPosition}
                        onChangeText={this.props.onChangeText}
                        rootId={this.props.rootId}
                    />
                </View>
            </View>
        );
    }
}
