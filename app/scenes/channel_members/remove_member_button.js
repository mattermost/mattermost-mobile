// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';

import {getCurrentChannel, canManageChannelMembers} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';

function RemoveMemberButton(props) {
    const {canManageUsers} = props;
    if (!canManageUsers) {
        return null;
    }

    return (
        <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <TouchableOpacity
                onPress={() => props.emitter('remove_members')}
                style={{paddingHorizontal: 15}}
            >
                <FormattedText
                    id='channel_members_modal.remove'
                    defaultMessage='Remove'
                    style={{color: props.theme.sidebarHeaderTextColor}}
                />
            </TouchableOpacity>
        </View>
    );
}

RemoveMemberButton.propTypes = {
    emitter: PropTypes.func.isRequired,
    canManageUsers: PropTypes.bool.isRequired,
    currentChannel: PropTypes.object.isRequired,
    theme: PropTypes.object
};

RemoveMemberButton.defaultProps = {
    theme: {}
};

function mapStateToProps(state) {
    return {
        canManageUsers: canManageChannelMembers(state),
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(RemoveMemberButton);
