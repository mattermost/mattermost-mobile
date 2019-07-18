// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {
    popToRoot,
    showSearchModal,
    dismissAllModals,
} from 'app/actions/navigation';

import Hashtag from './hashtag';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            popToRoot,
            showSearchModal,
            dismissAllModals,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(Hashtag);
