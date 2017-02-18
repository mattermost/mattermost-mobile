// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    View
} from 'react-native';

import {getCurrentUserRoles} from 'service/selectors/entities/users';
import {getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {Constants} from 'service/constants';

import FormattedText from 'app/components/formatted_text';

function ChannelMemberTitle(props) {
    const {currentChannel, isAdmin} = props;
    const manage = (isAdmin && currentChannel.type !== Constants.DM_CHANNEL && currentChannel.name !== Constants.DEFAULT_CHANNEL);
    return (
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 50}}>
            <FormattedText
                id={manage ? 'channel_header.manageMembers' : 'channel_header.viewMembers'}
                defaultMessage={manage ? 'Manage Members' : 'View Members'}
                style={{color: props.theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold', textAlign: 'center'}}
            />
        </View>
    );
}

ChannelMemberTitle.propTypes = {
    isAdmin: PropTypes.bool,
    currentChannel: PropTypes.object.isRequired,
    theme: PropTypes.object
};

ChannelMemberTitle.defaultProps = {
    theme: {}
};

function mapStateToProps(state) {
    const currentUserRoles = getCurrentUserRoles(state);

    const isAdmin = currentUserRoles.includes('_admin');

    return {
        isAdmin,
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelMemberTitle);
