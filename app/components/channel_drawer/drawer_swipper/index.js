// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getDimensions} from 'app/selectors/device';

import DraweSwiper from './drawer_swiper';

function mapStateToProps(state) {
    return {
        ...getDimensions(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps, null, null, {withRef: true})(DraweSwiper);
