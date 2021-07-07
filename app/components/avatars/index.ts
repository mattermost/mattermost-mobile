// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import type {GlobalState} from '@mm-redux/types/store';

import Avatars from './avatars';

function mapStateToProps(state: GlobalState) {
    return {
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(Avatars);
