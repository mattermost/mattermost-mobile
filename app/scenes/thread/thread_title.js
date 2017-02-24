// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    View
} from 'react-native';

import {getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';

import FormattedText from 'app/components/formatted_text';

function ThreadTitle(props) {
    const {currentChannel, theme} = props;
    const channelName = currentChannel.display_name;

    return (
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 50}}>
            <FormattedText
                id='mobile.routes.thread'
                defaultMessage='{channelName} Thread'
                values={{channelName}}
                style={{color: theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold', textAlign: 'center'}}
            />
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
