// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {THREAD} from 'app/constants/screen';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ThreadBase from './thread_base';

export default class ThreadAndroid extends ThreadBase {
    render() {
        const {
            channelId,
            myMember,
            postIds,
            rootId,
            channelIsArchived,
            theme,
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
                    channelId={channelId}
                    channelIsArchived={channelIsArchived}
                    onCloseChannel={this.onCloseChannel}
                    rootId={rootId}
                    screenId={this.props.componentId}
                />
            );
        } else {
            content = (
                <Loading color={theme.centerChannelColor}/>
            );
        }

        const style = getStyleSheet(theme);
        return (
            <SafeAreaView>
                <StatusBar/>
                <KeyboardLayout>
                    <View style={style.separator}/>
                    {content}
                    {postTextBox}
                </KeyboardLayout>
            </SafeAreaView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    separator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        height: 1,
    },
}));
