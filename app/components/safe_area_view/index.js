// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import SafeAreaView from './safe_area';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(SafeAreaView);

