// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {Scene, Router} from 'react-native-router-flux';

import LoginContainer from './login/login_container.js';
import SelectServerContainer from './select_server/select_server_container.js';
import SelectTeamContainer from './select_team/select_team_container.js';
import ChannelContainer from './channel/channel_container.js';
import Logout from 'components/logout';
import {logout} from 'actions/users';

import {injectIntl, intlShape} from 'react-intl';

class Routes extends Component {
    static propTypes = {
        intl: intlShape.isRequired
    };

    render() {
        const {formatMessage} = this.props.intl;

        return (
            <Router>
                <Scene key='root'>
                    <Scene
                        key='goToSelectServer'
                        component={SelectServerContainer}
                        title={formatMessage({id: 'mobile.routes.enterServerUrl', defaultMessage: 'Enter Server URL'})}
                        initial={true}
                    />
                    <Scene
                        key='goToLogin'
                        component={LoginContainer}
                        title={formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'})}
                    />
                    <Scene
                        key='goToSelectTeam'
                        component={SelectTeamContainer}
                        title={formatMessage({id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'})}
                        renderRightButton={() =>
                            <Logout actions={logout}/>
                        }
                    />
                    <Scene
                        key='goToMain'
                        component={ChannelContainer}
                        hideNavBar={true}
                    />
                </Scene>
            </Router>
        );
    }
}

export default injectIntl(Routes);
