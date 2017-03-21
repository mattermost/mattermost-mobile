// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Image,
    InteractionManager,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Button from 'react-native-button';
import Icon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import {GlobalStyles} from 'app/styles';

import logo from 'assets/images/logo.png';

export default class SelectTeam extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        teams: PropTypes.object.isRequired,
        myMembers: PropTypes.object.isRequired,
        subscribeToHeaderEvent: PropTypes.func.isRequired,
        unsubscribeFromHeaderEvent: PropTypes.func.isRequired,
        actions: PropTypes.shape({
            closeDrawers: PropTypes.func.isRequired,
            closeModal: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired
        }).isRequired
    };

    static navigationProps = {
        renderLeftComponent: (props, emitter, theme) => {
            return (
                <TouchableOpacity
                    style={{flex: 1, paddingHorizontal: 15, justifyContent: 'center'}}
                    onPress={() => emitter('close')}
                >
                    <FormattedText
                        id='admin.select_team.close'
                        defaultMessage='Close'
                        style={{color: theme.sidebarHeaderTextColor}}
                    />
                </TouchableOpacity>
            );
        }
    };

    componentWillMount() {
        this.props.subscribeToHeaderEvent('close', this.props.actions.goBack);
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('close');
    }

    onSelectTeam = async (team) => {
        const {
            closeDrawers,
            closeModal,
            handleTeamChange
        } = this.props.actions;

        handleTeamChange(team);
        closeDrawers();
        InteractionManager.runAfterInteractions(closeModal);
    };

    render() {
        const content = [];
        const teams = Object.values(this.props.teams);
        for (const team of teams) {
            if (this.props.myMembers.hasOwnProperty(team.id)) {
                content.push(
                    <Button
                        key={team.id}
                        onPress={() => this.onSelectTeam(team)}
                        style={GlobalStyles.buttonListItemText}
                        containerStyle={GlobalStyles.buttonListItem}
                    >
                        {team.display_name}
                        <Icon
                            name='keyboard-arrow-right'
                            size={24}
                            color='#777'
                        />
                    </Button>
                );
            }
        }

        return (
            <View style={GlobalStyles.container}>
                <Image
                    style={GlobalStyles.logo}
                    source={logo}
                />
                <Text style={GlobalStyles.header}>
                    {this.props.config.SiteName}
                </Text>
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='web.root.signup_info'
                    defaultMessage='All team communication in one place, searchable and accessible anywhere'
                />
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='signup_team.choose'
                    defaultMessage='Your teams:'
                />
                {content}
            </View>
        );
    }
}
