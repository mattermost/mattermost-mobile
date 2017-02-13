// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    ListView,
    StyleSheet
} from 'react-native';

import Post from 'app/components/post';

import {addDatesToPostList} from 'service/utils/post_utils';

import DateHeader from './date_header';

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
        renderReplies: React.PropTypes.bool
    };

    constructor(props) {
        super(props);

        this.state = {
            dataSource: new ListView.DataSource({
                rowHasChanged: (a, b) => a !== b
            }).cloneWithRows(addDatesToPostList(this.props.posts))
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.posts !== this.props.posts) {
            this.setState({
                dataSource: this.state.dataSource.cloneWithRows(addDatesToPostList(nextProps.posts))
            });
        }
    }

    renderRow = (row) => {
        if (row instanceof Date) {
            return this.renderDateHeader(row);
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
