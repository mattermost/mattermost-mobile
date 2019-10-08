// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {
    StyleSheet,
    View,
} from 'react-native';

import ChannelPostList from 'app/screens/channel/channel_post_list';

export default class PostListWrapper extends PureComponent {
    static propTypes = {
        lastViewedAt: PropTypes.number,
        channelId: PropTypes.string,
        updateNativeScrollView: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            unreadChunkTimeStamp: props.lastViewedAt,
            channelId: props.channelId,
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (state.unreadChunkTimeStamp === null && props.lastViewedAt) {
            return {
                unreadChunkTimeStamp: props.lastViewedAt,
            };
        }

        if (props.channelId !== state.channelId) {
            return {
                unreadChunkTimeStamp: props.lastViewedAt,
                channelId: props.channelId,
            };
        }
        return null;
    }

    render() {
        return (
            <View style={style.container}>
                <ChannelPostList
                    unreadChunkTimeStamp={this.state.unreadChunkTimeStamp}
                    updateNativeScrollView={this.props.updateNativeScrollView}
                />
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
});
