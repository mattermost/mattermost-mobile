// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {View} from 'react-native';

import {getCurrentChannel, canManageChannelMembers} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'app/selectors/preferences';

import FormattedText from 'app/components/formatted_text';

function ChannelMembersTitle(props) {
    const {canManageUsers} = props;
    return (
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 50}}>
            <FormattedText
                id={canManageUsers ? 'channel_header.manageMembers' : 'channel_header.viewMembers'}
                defaultMessage={canManageUsers ? 'Manage Members' : 'View Members'}
                style={{color: props.theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold', textAlign: 'center'}}
            />
        </View>
    );
}

ChannelMembersTitle.propTypes = {
    canManageUsers: PropTypes.bool.isRequired,
    currentChannel: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired
};

ChannelMembersTitle.defaultProps = {
    theme: {}
};

function mapStateToProps(state) {
    return {
        canManageUsers: canManageChannelMembers(state),
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelMembersTitle);
