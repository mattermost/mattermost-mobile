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

export default class Routes extends Component {
    render() {
        return (
            <Router>
                <Scene key='root'>
                    <Scene
                        key='goToLogin'
                        component={LoginContainer}
                        title='Login'
                    />
                    <Scene
                        key='goToSelectServerContainer'
                        component={SelectServerContainer}
                        title='Enter Server URL'
                        initial={true}
                    />
                    <Scene
                        key='goToChannelsListContainer'
                        component={ChannelsListContainer}
                        title='Channels'
                    />
                    <Scene
                        key='goToSelectTeamContainer'
                        component={SelectTeamContainer}
                        title='Select Team'
                    />
                    <Scene
                        key='goToPostsListContainer'
                        component={PostsListContainer}
                        title='Posts List'
                    />
                </Scene>
            </Router>
        );
    }
}
