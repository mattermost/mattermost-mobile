// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getPluginIntegrations} from '@mm-redux/selectors/entities/plugins';
import {Plugins} from '@mm-redux/constants';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';

import Pluggable from './pluggable';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state) || {};
    const plugins = getPluginIntegrations(state, Plugins.PLUGIN_LOCATION_CHANNEL_HEADER);

    return {
        plugins,
        currentChannel,
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(Pluggable);
