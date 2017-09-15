// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';

import PostTextbox from 'app/components/post_textbox';

export default class ChannelPostTextbox extends React.PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        drafts: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            handlePostDraftChanged: PropTypes.func.isRequired
        }).isRequired
    };

    handleDraftChanged = (value) => {
        this.props.actions.handlePostDraftChanged(this.props.channelId, value);
    };

    blur = () => {
        this.refs.postTextbox.getWrappedInstance().getWrappedInstance().blur();
    };

    render() {
        const channelDraft = this.props.drafts[this.props.channelId] || {};

        return (
            <PostTextbox
                ref='postTextbox'
                files={channelDraft.files}
                value={channelDraft.draft}
                channelId={this.props.channelId}
                onChangeText={this.handleDraftChanged}
                navigator={this.props.navigator}
            />
        );
    }
}
