// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {refreshChannelWithRetry} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import PostList from './post_list';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            refreshChannelWithRetry
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostList);
