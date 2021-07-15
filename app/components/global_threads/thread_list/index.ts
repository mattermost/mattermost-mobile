// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import type {GlobalState} from '@mm-redux/types/store';

import ThreadList, {OwnProps, StateProps} from './thread_list';

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
    };
}

export default connect<StateProps, {}, OwnProps>(mapStateToProps)(injectIntl(ThreadList));
