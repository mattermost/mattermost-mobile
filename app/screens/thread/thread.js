// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';

import KeyboardLayout from 'app/components/layout/keyboard_layout';
import PostList from 'app/components/post_list';
import PostTextbox from 'app/components/post_textbox';
import StatusBar from 'app/components/status_bar';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class Thread extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            selectPost: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        myMember: PropTypes.object.isRequired,
        rootId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        postIds: PropTypes.array.isRequired
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

    render() {
        const {
            channelId,
            myMember,
            navigator,
            postIds,
            rootId,
            theme
        } = this.props;
        const style = getStyle(theme);

        return (
            <KeyboardLayout
                behavior='padding'
                style={style.container}
                keyboardVerticalOffset={65}
            >
                <StatusBar/>
                <PostList
                    indicateNewMessages={true}
                    postIds={postIds}
                    currentUserId={myMember.user_id}
                    lastViewedAt={this.state.lastViewedAt}
                    navigator={navigator}
                />
                <PostTextbox
                    rootId={rootId}
                    channelId={channelId}
                    navigator={navigator}
                />
            </KeyboardLayout>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    };
});
