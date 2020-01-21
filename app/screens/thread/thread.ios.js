// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import {getLastPostIndex} from 'mattermost-redux/utils/post_list';

import Autocomplete, {AUTOCOMPLETE_MAX_HEIGHT} from 'app/components/autocomplete';
import Loading from 'app/components/loading';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {THREAD} from 'app/constants/screen';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ThreadBase from './thread_base';

const ACCESSORIES_CONTAINER_NATIVE_ID = 'threadAccessoriesContainer';
const THREAD_POST_TEXTBOX_CURSOR_CHANGE = 'onThreadTextBoxCursorChange';
const THREAD_POST_TEXTBOX_VALUE_CHANGE = 'onThreadTextBoxValueChange';
const SCROLLVIEW_NATIVE_ID = 'threadPostList';

export default class ThreadIOS extends ThreadBase {
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
                <React.Fragment>
                    <PostList
                        renderFooter={this.renderFooter()}
                        indicateNewMessages={false}
                        postIds={postIds}
                        lastPostIndex={getLastPostIndex(postIds)}
                        currentUserId={myMember && myMember.user_id}
                        lastViewedAt={this.state.lastViewedAt}
                        onPostPress={this.hideKeyboard}
                        location={THREAD}
                        scrollViewNativeID={SCROLLVIEW_NATIVE_ID}
                    />
                    <View nativeID={ACCESSORIES_CONTAINER_NATIVE_ID}>
                        <Autocomplete
                            maxHeight={AUTOCOMPLETE_MAX_HEIGHT}
                            onChangeText={this.handleAutoComplete}
                            cursorPositionEvent={THREAD_POST_TEXTBOX_CURSOR_CHANGE}
                            valueEvent={THREAD_POST_TEXTBOX_VALUE_CHANGE}
                            rootId={rootId}
                        />
                    </View>
                </React.Fragment>
            );

            postTextBox = (
                <KeyboardTrackingView
                    scrollViewNativeID={SCROLLVIEW_NATIVE_ID}
                    accessoriesContainerID={ACCESSORIES_CONTAINER_NATIVE_ID}
                >
                    <PostTextbox
                        channelId={channelId}
                        channelIsArchived={channelIsArchived}
                        cursorPositionEvent={THREAD_POST_TEXTBOX_CURSOR_CHANGE}
                        onCloseChannel={this.onCloseChannel}
                        ref={this.postTextbox}
                        rootId={rootId}
                        screenId={this.props.componentId}
                        valueEvent={THREAD_POST_TEXTBOX_VALUE_CHANGE}
                    />
                </KeyboardTrackingView>
            );
        } else {
            content = (
                <Loading color={theme.centerChannelColor}/>
            );
        }

        const style = getStyleSheet(theme);
        return (
            <React.Fragment>
                <SafeAreaView
                    excludeHeader={true}
                    forceInsets={true}
                >
                    <View style={style.separator}/>
                    <StatusBar/>
                    {content}
                </SafeAreaView>
                {postTextBox}
            </React.Fragment>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    separator: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        height: 1,
    },
}));
