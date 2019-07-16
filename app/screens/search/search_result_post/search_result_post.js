// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import Post from 'app/components/post';

export default class SearchResultPost extends PureComponent {
    static propTypes = {
        isDeleted: PropTypes.bool.isRequired,
        goToThread: PropTypes.func.isRequired,
        highlightPinnedOrFlagged: PropTypes.bool,
        managedConfig: PropTypes.object.isRequired,
        onHashtagPress: PropTypes.func,
        onPermalinkPress: PropTypes.func.isRequired,
        postId: PropTypes.string.isRequired,
        previewPost: PropTypes.func.isRequired,
        showFullDate: PropTypes.bool,
        skipFlaggedHeader: PropTypes.bool,
        skipPinnedHeader: PropTypes.bool,
    };

    static defaultProps = {
        showFullDate: false,
    };

    render() {
        const postComponentProps = {};

        if (this.props.isDeleted) {
            postComponentProps.shouldRenderReplyButton = false;
        } else {
            postComponentProps.onPress = this.props.previewPost;
            postComponentProps.onReply = this.props.goToThread;
            postComponentProps.shouldRenderReplyButton = true;
            postComponentProps.managedConfig = this.props.managedConfig;
            postComponentProps.onHashtagPress = this.props.onHashtagPress;
            postComponentProps.onPermalinkPress = this.props.onPermalinkPress;
            postComponentProps.highlightPinnedOrFlagged = this.props.highlightPinnedOrFlagged;
            postComponentProps.skipFlaggedHeader = this.props.skipFlaggedHeader;
            postComponentProps.skipPinnedHeader = this.props.skipPinnedHeader;
        }

        return (
            <Post
                postId={this.props.postId}
                {...postComponentProps}
                isSearchResult={true}
                showAddReaction={false}
                showFullDate={this.props.showFullDate}
            />
        );
    }
}
