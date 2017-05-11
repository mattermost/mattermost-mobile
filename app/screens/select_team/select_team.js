// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Image,
    InteractionManager,
    ScrollView,
    Text,
    View
} from 'react-native';
import Button from 'react-native-button';
import Icon from 'react-native-vector-icons/MaterialIcons';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {GlobalStyles} from 'app/styles';
import FormattedText from 'app/components/formatted_text';

import logo from 'assets/images/logo.png';

export default class SelectTeam extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        currentChannelId: PropTypes.string,
        navigator: PropTypes.object,
        teams: PropTypes.array.isRequired,
        actions: PropTypes.shape({
            handleTeamChange: PropTypes.func.isRequired,
            markChannelAsRead: PropTypes.func.isRequired
        }).isRequired
    };

    state = {
        disableButtons: false
    };

    onSelectTeam = async (team) => {
        if (!this.state.disableButtons) {
            this.setState({disableButtons: true});
            const {
                currentChannelId,
                handleTeamChange,
                markChannelAsRead
            } = this.props.actions;

            if (currentChannelId) {
                markChannelAsRead(currentChannelId);
            }
            handleTeamChange(team);
            EventEmitter.emit('close_channel_drawer');
            InteractionManager.runAfterInteractions(() => {
                this.props.navigator.dismissAllModals({
                    animationType: 'slide-down'
                });
            });
        }
    };

    render() {
        const content = this.props.teams.map((team) => {
            return (
                <Button
                    key={team.id}
                    onPress={() => this.onSelectTeam(team)}
                    style={GlobalStyles.buttonListItemText}
                    containerStyle={GlobalStyles.buttonListItem}
                    disabled={this.state.disableButtons}
                >
                    {team.display_name}
                    <Icon
                        name='keyboard-arrow-right'
                        size={24}
                        color='#777'
                    />
                </Button>
            );
        });

        return (
            <View style={GlobalStyles.container}>
                <ScrollView
                    style={{flex: 1}}
                    contentContainerStyle={{alignItems: 'center', paddingVertical: 64}}
                    showsVerticalScrollIndicator={false}
                >
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
                </ScrollView>
            </View>
        );
    }
}
