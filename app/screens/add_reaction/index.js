// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {dismissModal, setButtons} from 'app/actions/navigation';

import AddReaction from './add_reaction';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            dismissModal,
            setButtons,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AddReaction);
