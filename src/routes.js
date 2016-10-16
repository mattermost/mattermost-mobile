/* eslint-disable
  class-methods-use-this,
  react/require-optimization */

import React, {Component} from 'react';
import {Scene, Router} from 'react-native-router-flux';
import SelectServerView from 'components/select_server_view';
import SelectTeam from 'components/select_team';

export default class Routes extends Component {
    render() {
        return (
            <Router>
                <Scene key='root'>
                    <Scene
                        key='SelectServerView'
                        component={SelectServerView}
                        title='SelectServerView'
                        initial={true}
                    />
                    <Scene
                        key='SelectTeam'
                        component={SelectTeam}
                        title='SelectTeam'
                    />
                </Scene>
            </Router>
        );
    }
}
