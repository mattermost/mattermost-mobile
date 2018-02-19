// Copyright (c) 201-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import Post from 'app/components/post';

export default class SearchResultPost extends PureComponent {
    static propTypes = {
        isDeleted: PropTypes.bool.isRequired,
        goToThread: PropTypes.func.isRequired,
        managedConfig: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        onPermalinkPress: PropTypes.func.isRequired,
        postId: PropTypes.string.isRequired,
        previewPost: PropTypes.func.isRequired,
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
            postComponentProps.onPermalinkPress = this.props.onPermalinkPress;
        }

        return (
            <Post
                postId={this.props.postId}
                {...postComponentProps}
                isSearchResult={true}
                showFullDate={true}
                navigator={this.props.navigator}
            />
        );
    }
}
