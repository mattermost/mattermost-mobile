// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentTeamId} from '@redux/selectors/entities/teams';
import {getTheme} from '@redux/selectors/entities/preferences';
import {getProfiles, searchProfiles} from '@redux/actions/users';
import {getChannels, searchChannels} from '@redux/actions/channels';
import {isLandscape} from 'app/selectors/device';
import SelectorScreen from './selector_screen';

function mapStateToProps(state) {
    const menuAction = state.views.post.selectedMenuAction || {};

    const data = menuAction.options || [];

    return {
        currentTeamId: getCurrentTeamId(state),
        data,
        dataSource: menuAction.dataSource,
        onSelect: menuAction.onSelect,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfiles,
            getChannels,
            searchProfiles,
            searchChannels,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectorScreen);
