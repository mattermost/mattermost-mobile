// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import Autocomplete from '@components/autocomplete';
import Loading from '@components/loading';
import PostList from '@components/post_list';
import PostDraft from '@components/post_draft';
import SafeAreaView from '@components/safe_area_view';
import StatusBar from '@components/status_bar';
import {THREAD} from '@constants/screen';
import {getLastPostIndex} from '@mm-redux/utils/post_list';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ThreadBase from './thread_base';

const ACCESSORIES_CONTAINER_NATIVE_ID = 'threadAccessoriesContainer';
const THREAD_POST_TEXTBOX_CURSOR_CHANGE = 'onThreadTextBoxCursorChange';
const THREAD_POST_TEXTBOX_VALUE_CHANGE = 'onThreadTextBoxValueChange';
const SCROLLVIEW_NATIVE_ID = 'threadPostList';

export default class ThreadIOS extends ThreadBase {
    handleAutoComplete = (value) => {
        if (this.postDraft?.current) {
            this.postDraft.current.handleInputQuickAction(value);
        }
    };

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
        let postDraft;
        if (this.hasRootPost()) {
            content = (
                <>
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
                            onChangeText={this.handleAutoComplete}
                            cursorPositionEvent={THREAD_POST_TEXTBOX_CURSOR_CHANGE}
                            valueEvent={THREAD_POST_TEXTBOX_VALUE_CHANGE}
                            rootId={rootId}
                        />
                    </View>
                </>
            );

            postDraft = (
                <KeyboardTrackingView
                    scrollViewNativeID={SCROLLVIEW_NATIVE_ID}
                    accessoriesContainerID={ACCESSORIES_CONTAINER_NATIVE_ID}
                >
                    <PostDraft
                        channelId={channelId}
                        channelIsArchived={channelIsArchived}
                        cursorPositionEvent={THREAD_POST_TEXTBOX_CURSOR_CHANGE}
                        ref={this.postDraft}
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
                {postDraft}
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
