// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {THREAD} from 'app/constants/screen';

import Loading from 'app/components/loading';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';

import ThreadBase from './thread_base';

export default class ThreadAndroid extends ThreadBase {
    render() {
        const {
            channelId,
            myMember,
            postIds,
            rootId,
            channelIsArchived,
        } = this.props;

        let content;
        let postTextBox;
        if (this.hasRootPost()) {
            content = (
                <PostList
                    renderFooter={this.renderFooter()}
                    indicateNewMessages={false}
                    postIds={postIds}
                    currentUserId={myMember && myMember.user_id}
                    lastViewedAt={this.state.lastViewedAt}
                    lastPostIndex={-1}
                    onPostPress={this.hideKeyboard}
                    location={THREAD}
                />
            );

            postTextBox = (
                <PostTextbox
                    channelIsArchived={channelIsArchived}
                    rootId={rootId}
                    channelId={channelId}
                    onCloseChannel={this.onCloseChannel}
                />
            );
        } else {
            content = (
                <Loading/>
            );
        }

        return (
            <SafeAreaView>
                <StatusBar/>
                <KeyboardLayout>
                    {content}
                    {postTextBox}
                </KeyboardLayout>
            </SafeAreaView>
        );
    }
}
