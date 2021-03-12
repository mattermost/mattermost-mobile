// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch, ActionCreatorsMapObject} from 'redux';

import {getAppsBindings} from '@mm-redux/selectors/entities/apps';
import {AppBindingLocations} from '@mm-redux/constants/apps';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {GlobalState} from '@mm-redux/types/store';
import {ActionResult, GenericAction, ActionFunc} from '@mm-redux/types/actions';
import {AppCallRequest, AppCallType} from '@mm-redux/types/apps';

import {appsEnabled} from '@utils/apps';
import {doAppCall} from '@actions/apps';

import Bindings from './bindings';

function mapStateToProps(state: GlobalState) {
    const apps = appsEnabled(state);
    const currentChannel = getCurrentChannel(state) || {};
    const bindings = apps ? getAppsBindings(state, AppBindingLocations.CHANNEL_HEADER_ICON) : [];

    return {
        bindings,
        currentChannel,
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
