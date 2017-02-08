// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    View
} from 'react-native';

import {getCurrentUserRoles} from 'service/selectors/entities/users';
import {getTheme} from 'service/selectors/entities/preferences';

import FormattedText from 'app/components/formatted_text';

function ChannelMemberTitle(props) {
    return (
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 50}}>
            <FormattedText
                id={props.isAdmin ? 'channel_header.manageMembers' : 'channel_header.viewMembers'}
                defaultMessage={props.isAdmin ? 'Manage Members' : 'View Members'}
                style={{color: props.theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold', textAlign: 'center'}}
            />
        </View>
    );
}

ChannelMemberTitle.propTypes = {
    isAdmin: PropTypes.bool,
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
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelMemberTitle);
