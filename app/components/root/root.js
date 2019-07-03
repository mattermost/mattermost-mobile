// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {IntlProvider} from 'react-intl';
import {Platform} from 'react-native';

import {Client4} from 'mattermost-redux/client';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';

export default class Root extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            resetToTeams: PropTypes.func.isRequired,
        }).isRequired,
        children: PropTypes.node,
        excludeEvents: PropTypes.bool,
        currentUrl: PropTypes.string,
        locale: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    componentWillMount() {
        Client4.setAcceptLanguage(this.props.locale);

        if (!this.props.excludeEvents) {
            EventEmitter.on(NavigationTypes.NAVIGATION_NO_TEAMS, this.handleNoTeams);
            EventEmitter.on(NavigationTypes.NAVIGATION_ERROR_TEAMS, this.errorTeamsList);
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.locale !== this.props.locale) {
            Client4.setAcceptLanguage(this.props.locale);
        }
    }

    componentWillUnmount() {
        if (!this.props.excludeEvents) {
            EventEmitter.off(NavigationTypes.NAVIGATION_NO_TEAMS, this.handleNoTeams);
            EventEmitter.off(NavigationTypes.NAVIGATION_ERROR_TEAMS, this.errorTeamsList);
        }
    }

    handleNoTeams = () => {
        if (!this.refs.provider) {
            setTimeout(this.handleNoTeams, 200);
            return;
        }
        this.navigateToTeamsPage('SelectTeam');
    };

    errorTeamsList = () => {
        if (!this.refs.provider) {
            setTimeout(this.errorTeamsList, 200);
            return;
        }
        this.navigateToTeamsPage('ErrorTeamsList');
    }

    navigateToTeamsPage = (screen) => {
        const {currentUrl, theme, actions} = this.props;
        const {intl} = this.refs.provider.getChildContext();

        let passProps = {theme};
        const options = {topBar: {}};
        if (Platform.OS === 'android') {
            options.topBar.rightButtons = [{
                id: 'logout',
                text: intl.formatMessage({id: 'sidebar_right_menu.logout', defaultMessage: 'Logout'}),
                color: theme.sidebarHeaderTextColor,
                showAsAction: 'always',
            }];
        } else {
            options.topBar.leftButtons = [{
                id: 'logout',
                text: intl.formatMessage({id: 'sidebar_right_menu.logout', defaultMessage: 'Logout'}),
                color: theme.sidebarHeaderTextColor,
            }];
        }

        if (screen === 'SelectTeam') {
            passProps = {
                ...passProps,
                currentUrl,
                userWithoutTeams: true,
            };
        }

        const title = intl.formatMessage({id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'});

        actions.resetToTeams(screen, title, passProps, options);
    }

    render() {
        const locale = this.props.locale;

        return (
            <IntlProvider
                ref='provider'
                locale={locale}
                messages={getTranslations(locale)}
            >
                {this.props.children}
            </IntlProvider>
        );
    }
}
