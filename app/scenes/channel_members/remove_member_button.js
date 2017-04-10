// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';

import ActionButton from 'app/components/action_button';

import {canManageChannelMembers} from 'mattermost-redux/selectors/entities/channels';

function RemoveMemberButton(props) {
    const {canManageUsers} = props;
    if (!canManageUsers) {
        return null;
    }

    return (
        <ActionButton
            actionEventName='remove_members'
            emitter={props.emitter}
            enabled={false}
            enableEventName='can_remove_members'
            labelDefaultMessage='Remove'
            labelId='channel_members_modal.remove'
            loadingEventName='removing_members'
        />
    );
}

RemoveMemberButton.propTypes = {
    emitter: PropTypes.func.isRequired,
    canManageUsers: PropTypes.bool.isRequired
};

function mapStateToProps(state) {
    return {
        canManageUsers: canManageChannelMembers(state)
    };
}

export default connect(mapStateToProps)(RemoveMemberButton);
