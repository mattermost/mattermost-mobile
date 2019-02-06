// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import InteractiveDialogController from './interactive_dialog_controller';

function mapStateToProps(state) {
    return {
        triggerId: state.entities.integrations.dialogTriggerId,
        dialog: state.entities.integrations.dialog || {},
    };
}

export default connect(mapStateToProps)(InteractiveDialogController);
