/* eslint-disable
  class-methods-use-this,
  react/require-optimization */

import React, {Component} from 'react';
import {Scene, Router} from 'react-native-router-flux';

import ChannelsList from 'components/channels_list';
import Login from 'components/login';
import SelectServerView from 'components/select_server_view';
import SelectTeam from 'components/select_team';
import PostsList from 'components/posts_list';

export default class Routes extends Component {
    render() {
        return (
            <Router>
                <Scene key='root'>
                    <Scene
                        key='goToLogin'
                        component={Login}
                        title='Login'
                    />
                    <Scene
                        key='goToSelectServerView'
                        component={SelectServerView}
                        title='Enter Server URL'
                        initial={true}
                    />
                    <Scene
                        key='goToSelectServerView'
                        component={SelectServerView}
                        title='Enter Server URL'
                        initial={true}
                    />
                    <Scene
                        key='goToChannelsList'
                        component={ChannelsList}
                        title='Channels'
                    />
                    <Scene
                        key='goToSelectTeam'
                        component={SelectTeam}
                        title='Select Team'
                    />
                    <Scene
                        key='goToPostsList'
                        component={PostsList}
                        title='Posts List'
                    />
                </Scene>
            </Router>
        );
    }
}
