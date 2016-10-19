// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import Config from 'config/config.js';
import {connect} from 'react-redux';
import {loadDevice} from 'actions/device';
import Loading from 'components/loading';
import Routes from 'routes';

import {getTranslations} from 'i18n/i18n.js';
import {IntlProvider} from 'react-intl';

class RootContainer extends React.Component {
    static propTypes = {
        device: React.PropTypes.object.isRequired,
        loadDevice: React.PropTypes.func.isRequired
    }

    constructor(props) {
        super(props);

        this.props.loadDevice();
    }

    render() {
        const device = this.props.device;

        if (device.loading) {
            return (
                <Loading/>
            );
        }

        const locale = Config.DefaultLocale;

        return (
            <IntlProvider
                key={locale}
                locale={locale}
                messages={getTranslations(locale)}
            >
                <Routes/>
            </IntlProvider>
        );
    }
}

function mapStateToProps(state) {
    return {
        device: state.views.device
    };
}

export default connect(mapStateToProps, {
    loadDevice
})(RootContainer);
