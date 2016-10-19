/* eslint-disable
  class-methods-use-this,
  react/require-optimization */

import React, {Component} from 'react';
import {Scene, Router} from 'react-native-router-flux';

import ChannelsListContainer from 'containers/channels_list_container';
import LoginContainer from 'containers/login_container';
import SelectServerContainer from 'containers/select_server_container';
import SelectTeamContainer from 'containers/select_team_container';
import PostsListContainer from 'containers/posts_list_container';

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
                        key='goToLogin'
                        component={LoginContainer}
                        title={formatMessage({id: 'routes.login', defaultMessage: 'Login'})}
                    />
                    <Scene
                        key='goToSelectServer'
                        component={SelectServerContainer}
                        title={formatMessage({id: 'routes.enterServerUrl', defaultMessage: 'Enter Server URL'})}
                        initial={true}
                    />
                    <Scene
                        key='goToChannelsList'
                        component={ChannelsListContainer}
                        title={formatMessage({id: 'routes.channels', defaultMessage: 'Channels'})}
                    />
                    <Scene
                        key='goToSelectTeam'
                        component={SelectTeamContainer}
                        title={formatMessage({id: 'routes.selectTeam', defaultMessage: 'Select Team'})}
                    />
                    <Scene
                        key='goToPostsList'
                        component={PostsListContainer}
                        title={formatMessage({id: 'routes.postsList', defaultMessage: 'Posts List'})}
                    />
                </Scene>
            </Router>
        );
    }
}

export default injectIntl(Routes);
