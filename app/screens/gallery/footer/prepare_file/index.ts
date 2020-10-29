// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {isLandscape} from '@selectors/device';

import type {GlobalState} from '@mm-redux/types/store';

import PrepareFile from './prepare_file';

function mapStateToProps(state: GlobalState) {
    return {
        isLandscape: isLandscape(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(PrepareFile);
