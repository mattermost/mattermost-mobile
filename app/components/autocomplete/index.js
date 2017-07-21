// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
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
    },
    searchContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        maxHeight: 300,
        overflow: 'hidden',
        zIndex: 5
    }
});

export default class Autocomplete extends Component {
    static propTypes = {
        onChangeText: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        isSearch: PropTypes.bool
    };

    static defaultProps = {
        isSearch: false
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
        const container = this.props.isSearch ? style.searchContainer : style.container;
        return (
            <View>
                <View style={container}>
                    <AtMention
                        cursorPosition={this.state.cursorPosition}
                        {...this.props}
                    />
                    <ChannelMention
                        cursorPosition={this.state.cursorPosition}
                        {...this.props}
                    />
                </View>
            </View>
        );
    }
}
