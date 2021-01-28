// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {GlobalState} from '@mm-redux/types/store';
import {getAppsBindings} from '@mm-redux/selectors/entities/apps';
import {AppsBindings} from '@mm-redux/constants/apps';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {doAppCall} from '@actions/apps';
import {shouldProcessApps} from '@utils/apps';

import Pluggable from './bindings';

function mapStateToProps(state: GlobalState) {
    const processApps = shouldProcessApps(state);
    const bindings = processApps ? getAppsBindings(state, AppsBindings.POST_MENU_ITEM) : [];
    const currentUser = getCurrentUser(state);

    return {
        theme: getTheme(state),
        bindings,
        currentUser,
        shouldProcessApps: processApps,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            doAppCall,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Pluggable);
