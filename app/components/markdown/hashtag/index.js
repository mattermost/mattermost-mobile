// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {showSearchModal} from 'app/actions/views/search';

import Hashtag from './hashtag';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            showSearchModal,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(Hashtag);
