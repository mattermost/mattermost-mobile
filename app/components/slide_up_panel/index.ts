// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getDimensions} from 'app/selectors/device';

import SlideUpPanel from './slide_up_panel';
import {GlobalState} from '@mm-redux/types/store';

type OwnProps = {
    containerHeight?: number;
}

function mapStateToProps(state: GlobalState, props: OwnProps) {
    const dimensions = getDimensions(state);
    return {
        containerHeight: props.containerHeight || dimensions.deviceHeight,
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(SlideUpPanel);
