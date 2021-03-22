// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';

import AppFormSelector from './app_form_selector';
import {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    return {
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(AppFormSelector);
