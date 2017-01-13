// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {ListView} from 'react-native';

import Post from 'app/components/post';

export default class PostList extends React.Component {
    static propTypes = {
        posts: React.PropTypes.arrayOf(React.PropTypes.object).isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            dataSource: new ListView.DataSource({
                rowHasChanged: (a, b) => a !== b
            }).cloneWithRows(this.props.posts)
        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            dataSource: this.state.dataSource.cloneWithRows(nextProps.posts)
        });
    }

    renderPost(post) {
        return (
            <Post
                style={{transform: [{rotate: '180deg'}]}}
                post={post}
            />
        );
    }

    render() {
        return (
            <ListView
                style={{transform: [{rotate: '180deg'}]}}
                enableEmptySections={true}
                dataSource={this.state.dataSource}
                renderRow={this.renderPost}
            />
        );
    }
}
