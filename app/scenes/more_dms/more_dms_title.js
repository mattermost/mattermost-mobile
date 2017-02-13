// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {
    View
} from 'react-native';

import {getTheme} from 'service/selectors/entities/preferences';

import FormattedText from 'app/components/formatted_text';

function MoreDirectChannelsTitle(props) {
    return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 50}}>
            <FormattedText
                id='more_direct_channels.title'
                defaultMessage='Direct Messages'
                style={{color: props.theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold', textAlign: 'center'}}
            />
        </View>
    );
}

MoreDirectChannelsTitle.propTypes = {
    theme: PropTypes.object
};

MoreDirectChannelsTitle.defaultProps = {
    theme: {}
};

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(MoreDirectChannelsTitle);
