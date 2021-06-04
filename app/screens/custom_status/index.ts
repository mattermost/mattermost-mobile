// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserTimezone, isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {GenericAction} from '@mm-redux/types/actions';
import {GlobalState} from '@mm-redux/types/store';
import {getRecentCustomStatuses, isCustomStatusExpired, makeGetCustomStatus} from '@selectors/custom_status';
import {setCustomStatus, unsetCustomStatus, removeRecentCustomStatus} from '@actions/views/custom_status';

import CustomStatusModal from '@screens/custom_status/custom_status_modal';
import {isLandscape} from '@selectors/device';
import {UserCustomStatus} from '@mm-redux/types/users';

function makeMapStateToProps() {
    const getCustomStatus = makeGetCustomStatus();
    return (state: GlobalState) => {
        const customStatus: UserCustomStatus | undefined = getCustomStatus(state);
        const recentCustomStatuses = getRecentCustomStatuses(state);
        const theme = getTheme(state);
        const userTimezone = getCurrentUserTimezone(state);
        const customStatusExpired = isCustomStatusExpired(state, customStatus);

        return {
            isTimezoneEnabled: isTimezoneEnabled(state),
            userTimezone,
            customStatus,
            recentCustomStatuses,
            theme,
            isLandscape: isLandscape(state),
            isCustomStatusExpired: customStatusExpired,
        };
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

export default connect(makeMapStateToProps, mapDispatchToProps)(CustomStatusModal);
