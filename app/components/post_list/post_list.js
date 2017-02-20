// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    ListView,
    StyleSheet
} from 'react-native';

import Post from 'app/components/post';

import {Constants} from 'service/constants';
import {addDatesToPostList} from 'service/utils/post_utils';

import DateHeader from './date_header';
import NewMessagesDivider from './new_messages_divider';

const style = StyleSheet.create({
    container: {
        transform: [{rotate: '180deg'}]
    },
    row: {
        transform: [{rotate: '180deg'}]
    }
});

export default class PostList extends React.Component {
    static propTypes = {
        posts: React.PropTypes.array.isRequired,
        theme: React.PropTypes.object.isRequired,
        onPostPress: React.PropTypes.func,
        renderReplies: React.PropTypes.bool,
        indicateNewMessages: React.PropTypes.bool,
        lastViewedAt: React.PropTypes.number
    };

    constructor(props) {
        super(props);
        const {posts, indicateNewMessages, lastViewedAt} = this.props;
        this.state = {
            dataSource: new ListView.DataSource({
                rowHasChanged: (a, b) => a !== b
            }).cloneWithRows(addDatesToPostList(posts, indicateNewMessages, lastViewedAt))
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.posts !== this.props.posts) {
            const {posts, indicateNewMessages, lastViewedAt} = nextProps;
            const dataSource = this.state.dataSource.cloneWithRows(
                addDatesToPostList(posts, indicateNewMessages, lastViewedAt)
            );
            this.setState({dataSource});
        }
    }

    renderRow = (row) => {
        if (row instanceof Date) {
            return this.renderDateHeader(row);
        }
        if (row === Constants.START_OF_NEW_MESSAGES) {
            return (
                <NewMessagesDivider
                    theme={this.props.theme}
                    style={style.row}
                />
            );
        }

        return this.renderPost(row);
    };

    renderDateHeader = (date) => {
        return (
            <DateHeader
                theme={this.props.theme}
                style={style.row}
                date={date}
            />
        );
    };

    renderPost = (post) => {
        return (
            <Post
                style={style.row}
                post={post}
                renderReplies={this.props.renderReplies}
                isFirstReply={post.isFirstReply}
                isLastReply={post.isLastReply}
                commentedOnPost={post.commentedOnPost}
                onPress={this.props.onPostPress}
            />
        );
    };

    render() {
        return (
            <ListView
                style={style.container}
                enableEmptySections={true}
                dataSource={this.state.dataSource}
                renderSectionHeader={this.renderSectionHeader}
                renderRow={this.renderRow}
                showsVerticalScrollIndicator={false}
            />
        );
    }
}
