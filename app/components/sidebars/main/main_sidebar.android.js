// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Dimensions, Keyboard} from 'react-native';
import {IntlProvider} from 'react-intl';

import {WebsocketEvents} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {closeMainSideMenu, enableMainSideMenu} from 'app/actions/navigation';
import {getTranslations} from 'app/i18n';

import MainSidebarBase from './main_sidebar_base';

export default class MainSidebarAndroid extends MainSidebarBase {
    constructor(props) {
        super(props);

        this.state = {
            deviceWidth: Dimensions.get('window').width,
            opened: false,
            searching: false,
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.props.actions.getTeams();
        EventEmitter.on('close_main_sidebar', this.closeChannelDrawer);
        EventEmitter.on('main_sidebar_did_close', this.handleSidebarDidClose);
        EventEmitter.on('main_sidebar_did_open', this.handleSidebarDidOpen);
        EventEmitter.on(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        Dimensions.addEventListener('change', this.handleDimensions);
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {currentTeamId, teamsCount, theme} = this.props;
        const {deviceWidth, searching} = this.state;

        if (nextState.searching !== searching || nextState.deviceWidth !== deviceWidth) {
            return true;
        }

        return nextProps.currentTeamId !== currentTeamId ||
            nextProps.teamsCount !== teamsCount ||
            nextProps.theme !== theme;
    }

    componentWillUnmount() {
        this.mounted = false;
        EventEmitter.off('close_main_sidebar', this.closeChannelDrawer);
        EventEmitter.off('main_sidebar_did_close', this.handleSidebarDidClose);
        EventEmitter.off('main_sidebar_did_open', this.handleSidebarDidOpen);
        EventEmitter.off(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        Dimensions.removeEventListener('change', this.handleDimensions);
    }

    handleDimensions = ({window}) => {
        if (this.mounted) {
            this.setState({deviceWidth: window.width});
        }
    };

    closeChannelDrawer = () => {
        closeMainSideMenu();
    };

    handleSidebarDidClose = () => {
        this.setState({searching: false, opened: false}, () => {
            enableMainSideMenu(true, false);
            this.resetDrawer(true);
            Keyboard.dismiss();
        });
    };

    handleSidebarDidOpen = () => {
        this.setState({opened: true});
    }

    onPageSelected = (index) => {
        this.swiperIndex = index;

        if (this.state.opened) {
            enableMainSideMenu(index !== 0, true);
        }
    };

    setProviderRef = (ref) => {
        this.providerRef = ref;
    }

    render() {
        const locale = this.props.locale;

        if (!locale) {
            return null;
        }

        return (
            <IntlProvider
                key={locale}
                locale={'en'}
                ref={this.setProviderRef}
                messages={getTranslations('en')}
            >
                {this.renderNavigationView(this.state.deviceWidth)}
            </IntlProvider>
        );
    }
}
