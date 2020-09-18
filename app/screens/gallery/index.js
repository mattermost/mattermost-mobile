// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getDimensions} from '@selectors/device';

import Gallery from './gallery';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(Gallery);
