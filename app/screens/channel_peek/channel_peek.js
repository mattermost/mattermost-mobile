// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

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
        postIds: PropTypes.array,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        postVisibility: 15,
    };

    constructor(props) {
        super(props);

        props.actions.loadPostsIfNecessaryWithRetry(props.channelId);
        this.state = {
            visiblePostIds: this.getVisiblePostIds(false),
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.postIds !== this.props.postIds) {
            this.getVisiblePostIds();
        }
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'action-mark-as-read') {
            const {actions, channelId} = this.props;
            actions.markChannelViewedAndRead(channelId);
        }
    }

    getVisiblePostIds = (updateState = true) => {
        const visiblePostIds = this.props.postIds?.slice(0, 15) || [];

        if (updateState) {
            this.setState({
                visiblePostIds,
            });
        }

        return visiblePostIds;
    };

    render() {
        const {
            channelId,
            currentUserId,
            lastViewedAt,
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
