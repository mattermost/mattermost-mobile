import React, {Component} from 'react';
import {Scene, Router} from 'react-native-router-flux';
import SelectServerView from 'components/select_server_view';
import PageTwo from 'components/page_two';

export default class PageOne extends Component {
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
                        key='pageTwo'
                        component={PageTwo}
                        title='PageTwo'
                    />
                </Scene>
            </Router>
        );
    }
}
