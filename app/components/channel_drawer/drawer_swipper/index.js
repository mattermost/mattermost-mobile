// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getDimensions, isLandscape} from 'app/selectors/device';

import DraweSwiper from './drawer_swiper';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        ...getDimensions(state),
        isLandscape: isLandscape(state)
    };
}

export default connect(mapStateToProps, null, null, {withRef: true})(DraweSwiper);
