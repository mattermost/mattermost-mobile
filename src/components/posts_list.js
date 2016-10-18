// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {StyleSheet, Text, View} from 'react-native';
import _ from 'lodash';

import * as postActions from 'actions/posts';
import ErrorText from 'components/error_text';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 200,
        backgroundColor: 'white'
    }
});

const propTypes = {
    posts: PropTypes.object.isRequired,
    currentTeamId: PropTypes.string.isRequired,
    currentChannelId: PropTypes.string.isRequired,
    actions: PropTypes.object.isRequired
};

class PostsList extends Component {
    static propTypes = propTypes;

    componentWillMount() {
        this.props.actions.fetchPosts(
            this.props.currentTeamId,
            this.props.currentChannelId
        );
    }

    render() {
        const posts = _.values(this.props.posts.data);
        return (
            <View style={styles.container}>
                {posts.map((post) => (
                    <Text key={post.id}>
                        {`${post.user_id} - ${post.message}`}
                    </Text>
                ))}
                <ErrorText error={this.props.posts.error}/>
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        posts: state.entities.posts,
        currentTeamId: state.entities.teams.currentTeamId,
        currentChannelId: state.entities.channels.currentChannelId
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(postActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostsList);
