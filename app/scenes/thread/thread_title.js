// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    View
} from 'react-native';

import {Constants} from 'mattermost-redux/constants';
import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'app/selectors/preferences';

import FormattedText from 'app/components/formatted_text';

function ThreadTitle(props) {
    const {currentChannel, theme} = props;
    let label;
    if (currentChannel.type === Constants.DM_CHANNEL) {
        label = (
            <FormattedText
                id='mobile.routes.thread_dm'
                defaultMessage='Direct Message Thread'
                ellipsizeMode='tail'
                numberOfLines={1}
                style={{color: theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold'}}
            />
        );
    } else {
        const channelName = currentChannel.display_name;
        label = (
            <FormattedText
                id='mobile.routes.thread'
                defaultMessage='{channelName} Thread'
                ellipsizeMode='tail'
                numberOfLines={1}
                values={{channelName}}
                style={{color: theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold'}}
            />
        );
    }

    return (
        <View style={{justifyContent: 'center', flex: 1, marginHorizontal: 1}}>
            {label}
        </View>
    );
}

ThreadTitle.propTypes = {
    currentChannel: PropTypes.object.isRequired,
    theme: PropTypes.object
};

ThreadTitle.defaultProps = {
    theme: {}
};

function mapStateToProps(state) {
    return {
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ThreadTitle);
