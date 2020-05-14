// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {canUploadFilesOnMobile} from '@mm-redux/selectors/entities/general';

import QuickActions from './quick_actions';

function mapStateToProps(state) {
    return {
        canUploadFiles: canUploadFilesOnMobile(state),
    };
}

export default connect(mapStateToProps)(QuickActions);