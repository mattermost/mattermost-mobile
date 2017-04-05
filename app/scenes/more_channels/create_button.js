// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
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
        <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <TouchableOpacity
                onPress={() => props.emitter('new_channel')}
                style={{paddingHorizontal: 15}}
            >
                <FormattedText
                    id='mobile.create_channel'
                    defaultMessage='Create'
                    style={{color: props.theme.sidebarHeaderTextColor}}
                />
            </TouchableOpacity>
        </View>
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
