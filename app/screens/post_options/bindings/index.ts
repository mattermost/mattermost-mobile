// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import Pluggable from './bindings';
import {GlobalState} from '@mm-redux/types/store';
import {getAppsBindings} from '@mm-redux/selectors/entities/apps';
import {AppsBindings} from '@mm-redux/constants/apps';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';

function mapStateToProps(state: GlobalState) {
    const bindings = getAppsBindings(state, AppsBindings.POST_MENU_ITEM);
    const currentUser = getCurrentUser(state);

    return {
        theme: getTheme(state),
        bindings,
        currentUser,
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(Pluggable);
