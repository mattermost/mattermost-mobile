// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionCreatorsMapObject, bindActionCreators, Dispatch} from 'redux';
import {connect} from 'react-redux';

import ActionButton from './action_button';

import {doPostActionWithCookie} from '@mm-redux/actions/posts';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {GlobalState} from '@mm-redux/types/store';
import {ActionFunc, ActionResult} from '@mm-redux/types/actions';

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
    };
}

type Actions = {
    doPostActionWithCookie: (postId: string, actionId: string, actionCookie: string, selectedOption?: string | undefined) => Promise<ActionResult>;
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators<ActionCreatorsMapObject<ActionFunc>, Actions>({
            doPostActionWithCookie,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ActionButton);
