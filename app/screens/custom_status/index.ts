// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {setCustomStatus, unsetCustomStatus, removeRecentCustomStatus} from '@actions/views/custom_status';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {GenericAction} from '@mm-redux/types/actions';
import {GlobalState} from '@mm-redux/types/store';
import CustomStatusModal from '@screens/custom_status/custom_status_modal';
import {getRecentCustomStatuses, makeGetCustomStatus} from '@selectors/custom_status';
import {isLandscape} from '@selectors/device';

const getCustomStatus = makeGetCustomStatus();

function mapStateToProps(state: GlobalState) {
    const customStatus = getCustomStatus(state);
    const recentCustomStatuses = getRecentCustomStatuses(state);
    const theme = getTheme(state);

    return {
        customStatus,
        recentCustomStatuses,
        theme,
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators({
            setCustomStatus,
            unsetCustomStatus,
            removeRecentCustomStatus,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomStatusModal);
