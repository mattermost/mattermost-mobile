// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getDimensions} from 'app/selectors/device';

import TableImage from './table_image';

function mapStateToProps(state) {
    return {
        deviceWidth: getDimensions(state).deviceWidth,
    };
}

export default connect(mapStateToProps)(TableImage);
