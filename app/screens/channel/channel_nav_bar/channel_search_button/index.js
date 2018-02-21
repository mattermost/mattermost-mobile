// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {clearSearch} from 'mattermost-redux/actions/search';

import {handlePostDraftChanged} from 'app/actions/views/channel';

import ChannelSearchButton from './channel_search_button';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearSearch,
            handlePostDraftChanged,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(ChannelSearchButton);
