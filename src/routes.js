// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {Scene, Router} from 'react-native-router-flux';

import LoginContainer from 'containers/login_container';
import SelectServerContainer from 'containers/select_server_container';
import SelectTeamContainer from 'containers/select_team_container';
import MainContainer from 'containers/main_container.js';
import Logout from 'components/logout';
import * as logout from 'actions/logout';

import {injectIntl, intlShape} from 'react-intl';

class Routes extends Component {
    static propTypes = {
        intl: intlShape.isRequired
    }

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
                        component={MainContainer}
                        hideNavBar={true}
                    />
                </Scene>
            </Router>
        );
    }
}

export default injectIntl(Routes);
