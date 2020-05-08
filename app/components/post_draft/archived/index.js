// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {selectPenultimateChannel} from '@actions/views/channel';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';

import Archived from './archived';

function mapStateToProps(state) {
    return {
        teamId: getCurrentTeamId(state),
    };
}

const mapDispatchToProps = {
    selectPenultimateChannel,
};

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Archived);
