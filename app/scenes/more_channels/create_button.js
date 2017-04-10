// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';

import ActionButton from 'app/components/action_button';

import {getTheme} from 'app/selectors/preferences';

import {Constants} from 'mattermost-redux/constants';
import {getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

function CreateButton(props) {
    if (!props.canCreateChannels) {
        return null;
    }

    return (
        <ActionButton
            actionEventName='create_channel'
            emitter={props.emitter}
            enabled={true}
            enableEventName='can_create_channel'
            labelDefaultMessage='Create'
            labelId='mobile.create_channel'
            loadingEventName='creating_channel'
        />
    );
}

CreateButton.propTypes = {
    canCreateChannels: PropTypes.bool.isRequired,
    emitter: PropTypes.func.isRequired,
    theme: PropTypes.object
};

CreateButton.defaultProps = {
    theme: {}
};

function mapStateToProps(state) {
    const {config, license} = state.entities.general;
    const roles = getCurrentUserRoles(state);

    return {
        canCreateChannels: showCreateOption(config, license, Constants.PRIVATE_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(CreateButton);
