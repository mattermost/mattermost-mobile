// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {StatusBar, StyleSheet} from 'react-native';

import KeyboardLayout from 'app/components/layout/keyboard_layout';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

const getStyle = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    });
});

export default class Thread extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            handleCommentDraftChanged: React.PropTypes.func.isRequired
        }).isRequired,
        teamId: React.PropTypes.string.isRequired,
        channelId: React.PropTypes.string.isRequired,
        rootId: React.PropTypes.string.isRequired,
        draft: React.PropTypes.string.isRequired,
        theme: React.PropTypes.object.isRequired,
        posts: React.PropTypes.array.isRequired
    };

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
                <PostList posts={this.props.posts}/>
                <PostTextbox
                    rootId={this.props.rootId}
                    value={this.props.draft}
                    teamId={this.props.teamId}
                    channelId={this.props.channelId}
                    onChangeText={this.handleDraftChanged}
                />
            </KeyboardLayout>
        );
    }
}
