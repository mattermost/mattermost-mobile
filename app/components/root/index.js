// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {resetToTeams} from 'app/actions/navigation';
import {getCurrentLocale} from 'app/selectors/i18n';
import {removeProtocol} from 'app/utils/url';

import Root from './root';

function mapStateToProps(state) {
    const locale = getCurrentLocale(state);

    return {
        theme: getTheme(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        locale,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            resetToTeams,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
