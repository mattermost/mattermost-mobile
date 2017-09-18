// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    handlePostDraftChanged
} from 'app/actions/views/channel';

import ChannelPostTextbox from './channel_post_textbox';

function mapStateToProps(state, ownProps) {
    return {
        draft: state.views.channel.drafts[ownProps.channelId] || {},
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handlePostDraftChanged
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(ChannelPostTextbox);
