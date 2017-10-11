// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {Client, Client4} from 'mattermost-redux/client';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';

import {getCurrentLocale} from 'app/selectors/i18n';
import {getTheme} from 'app/selectors/preferences';
import {removeProtocol} from 'app/utils/url';

import Root from './root';

function mapStateToProps(state, ownProps) {
    const locale = getCurrentLocale(state);
    Client.setLocale(locale);
    Client4.setAcceptLanguage(locale);

    return {
        ...ownProps,
        theme: getTheme(state),
        currentChannelId: getCurrentChannelId(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        locale
    };
}

export default connect(mapStateToProps)(Root);
