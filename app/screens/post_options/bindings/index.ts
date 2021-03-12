// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch, ActionCreatorsMapObject} from 'redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {GlobalState} from '@mm-redux/types/store';
import {AppCallRequest, AppCallType} from '@mm-redux/types/apps';
import {ActionResult, GenericAction, ActionFunc} from '@mm-redux/types/actions';
import {getAppsBindings} from '@mm-redux/selectors/entities/apps';
import {AppBindingLocations} from '@mm-redux/constants/apps';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';

import {doAppCall} from '@actions/apps';
import {appsEnabled} from '@utils/apps';

import Bindings from './bindings';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';

function mapStateToProps(state: GlobalState) {
    const apps = appsEnabled(state);
    const bindings = apps ? getAppsBindings(state, AppBindingLocations.POST_MENU_ITEM) : [];
    const currentUser = getCurrentUser(state);

    return {
        theme: getTheme(state),
        bindings,
        currentUser,
        teamID: getCurrentTeamId(state),
        appsEnabled: apps,
    };
}

type Actions = {
    doAppCall: (call: AppCallRequest, type: AppCallType, intl: any) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch<GenericAction>) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doAppCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Bindings);
