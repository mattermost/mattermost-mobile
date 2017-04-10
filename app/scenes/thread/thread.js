// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {StatusBar, StyleSheet} from 'react-native';

import ThreadTitle from './thread_title';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class Thread extends PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            handleCommentDraftChanged: PropTypes.func.isRequired,
            selectPost: PropTypes.func.isRequired
        }).isRequired,
        teamId: PropTypes.string.isRequired,
        channelId: PropTypes.string.isRequired,
        myMember: PropTypes.object.isRequired,
        files: PropTypes.array,
        rootId: PropTypes.string.isRequired,
        draft: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        posts: PropTypes.array.isRequired
    };

    static navigationProps = {
        renderTitleComponent: () => {
            return <ThreadTitle/>;
        }
    };

    state = {};

    componentWillReceiveProps(nextProps) {
        if (!this.state.lastViewedAt) {
            this.setState({lastViewedAt: nextProps.myMember.last_viewed_at});
        }
    }

    componentWillUnmount() {
        this.props.actions.selectPost('');
    }

    handleDraftChanged = (value) => {
        this.props.actions.handleCommentDraftChanged(this.props.rootId, value);
    };

    render() {
        const style = getStyle(this.props.theme);

        return (
            <KeyboardLayout
                behavior='padding'
                style={style.container}
                keyboardVerticalOffset={65}
            >
                <StatusBar barStyle='light-content'/>
                <PostList
                    indicateNewMessages={true}
                    posts={this.props.posts}
                    currentUserId={this.props.myMember.user_id}
                    lastViewedAt={this.state.lastViewedAt}
                />
                <PostTextbox
                    rootId={this.props.rootId}
                    value={this.props.draft}
                    files={this.props.files}
                    teamId={this.props.teamId}
                    channelId={this.props.channelId}
                    onChangeText={this.handleDraftChanged}
                />
            </KeyboardLayout>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    });
});
