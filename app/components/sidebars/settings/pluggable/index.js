// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getPluginIntegrations} from '@mm-redux/selectors/entities/plugins';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {Plugins} from '@mm-redux/constants';

import Pluggable from './pluggable';

function mapStateToProps(state) {
    const plugins = getPluginIntegrations(state, Plugins.PLUGIN_LOCATION_SETTINGS);

    return {
        theme: getTheme(state),
        plugins,
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(Pluggable);
