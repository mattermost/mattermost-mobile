/* eslint-disable
  class-methods-use-this,
  react/require-optimization */

import React, {Component} from 'react';
import {Scene, Router} from 'react-native-router-flux';

import ChannelsList from 'components/channels_list';
import SelectServerView from 'components/select_server_view';
import SelectTeam from 'components/select_team';

export default class Routes extends Component {
    render() {
        return (
            <Router>
                <Scene key='root'>
                    <Scene
                        key='ChannelsList'
                        component={ChannelsList}
                        title='Channels'
                    />
                    <Scene
                        key='SelectServerView'
                        component={SelectServerView}
                        title='Enter Server URL'
                        initial={true}
                    />
                    <Scene
                        key='SelectTeam'
                        component={SelectTeam}
                        title='Select Team'
                    />
                </Scene>
            </Router>
        );
    }
}
