// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {GlobalState} from '@mm-redux/types/store';
import ClearAfterModal from '@screens/custom_status_clear_after/clear_after_modal';

function mapStateToProps(state: GlobalState) {
    const theme = getTheme(state);
    return {
        theme,
    };
}
export default connect(mapStateToProps)(ClearAfterModal);
