// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, View} from 'react-native';

import {getLastPostIndex} from 'mattermost-redux/utils/post_list';

import PostList from 'app/components/post_list';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelPeek extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadPostsIfNecessaryWithRetry: PropTypes.func.isRequired,
            markChannelViewedAndRead: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string,
        lastViewedAt: PropTypes.number,
        navigator: PropTypes.object,
        postIds: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        postIds: [],
        postVisibility: 15,
    };

    constructor(props) {
        super(props);

        this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.actions.loadPostsIfNecessaryWithRetry(props.channelId);
        this.state = {
            visiblePostIds: this.getVisiblePostIds(props),
        };
    }

    componentWillReceiveProps(nextProps) {
        const {postIds: nextPostIds} = nextProps;

        let visiblePostIds = this.state.visiblePostIds;

        if (nextPostIds !== this.props.postIds) {
            visiblePostIds = this.getVisiblePostIds(nextProps);
        }

        this.setState({
            visiblePostIds,
        });
    }

    getVisiblePostIds = (props) => {
        return props.postIds.slice(0, 15);
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'PreviewActionPress') {
            if (event.id === 'action-mark-as-read') {
                const {actions, channelId} = this.props;
                actions.markChannelViewedAndRead(channelId);
            }
        }
    };

    render() {
        const {
            channelId,
            currentUserId,
            lastViewedAt,
            navigator,
            theme,
        } = this.props;

        const {visiblePostIds} = this.state;
        const style = getStyle(theme);

        return (
            <View style={style.container}>
                <PostList
                    postIds={visiblePostIds}
                    lastPostIndex={Platform.OS === 'android' ? getLastPostIndex(visiblePostIds) : -1}
                    renderReplies={true}
                    indicateNewMessages={true}
                    currentUserId={currentUserId}
                    lastViewedAt={lastViewedAt}
                    channelId={channelId}
                    navigator={navigator}
                />
            </View>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
    };
});
