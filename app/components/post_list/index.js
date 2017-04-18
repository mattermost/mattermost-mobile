// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import PostList from './post_list';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        channelIsLoading: state.views.channel.loading,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(PostList);
