// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {doPostAction} from 'mattermost-redux/actions/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {setMenuActionSelector} from 'app/actions/views/post';

import ActionMenu from './action_menu';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            doPostAction,
            setMenuActionSelector,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ActionMenu);
