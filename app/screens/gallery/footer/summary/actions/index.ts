// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {canDownloadFilesOnMobile, getConfig} from '@mm-redux/selectors/entities/general';
import type {GlobalState} from '@mm-redux/types/store';

import Actions from './actions';

function mapStateToProps(state: GlobalState) {
    const config = getConfig(state);

    return {
        canDownloadFiles: canDownloadFilesOnMobile(state),
        enablePublicLink: config?.EnablePublicLink === 'true',
    };
}

export default connect(mapStateToProps)(Actions);
