// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Image,
    InteractionManager,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Button from 'react-native-button';
import Icon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';

import logo from 'assets/images/logo.png';

export default class SelectTeam extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        teams: PropTypes.array.isRequired,
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
        const content = this.props.teams.map((team) => {
            return (
                <Button
                    key={team.id}
                    onPress={() => this.onSelectTeam(team)}
                    style={style.buttonListItemText}
                    containerStyle={style.buttonListItem}
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
            <View style={style.container}>
                <View style={style.wrapper}>
                    <Image
                        source={logo}
                    />
                    <Text style={style.header}>
                        {this.props.config.SiteName}
                    </Text>
                    <FormattedText
                        style={style.subheader}
                        id='web.root.signup_info'
                        defaultMessage='All team communication in one place, searchable and accessible anywhere'
                    />
                    <FormattedText
                        style={[style.subheader, style.subheader2]}
                        id='signup_team.choose'
                        defaultMessage='Your teams:'
                    />
                </View>
                <ScrollView style={style.scrollView}>
                    {content}
                </ScrollView>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        flex: 1
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center'
    },
    header: {
        fontSize: 32,
        fontWeight: '600',
        marginBottom: 15,
        marginTop: 15,
        textAlign: 'center'
    },
    subheader: {
        color: '#777',
        fontSize: 16,
        fontWeight: '300',
        lineHeight: 22,
        marginBottom: 15,
        textAlign: 'center'
    },
    subheader2: {
        lineHeight: 17,
        marginBottom: 0
    },
    scrollView: {
        flex: 1,
        flexDirection: 'column',
        ...Platform.select({
            android: {
                marginBottom: 22
            }
        })
    },
    buttonListItem: {
        alignSelf: 'stretch',
        backgroundColor: '#fafafa',
        borderColor: '#d5d5d5',
        borderRadius: 3,
        borderWidth: 1,
        height: 50,
        marginBottom: 5,
        marginHorizontal: 15,
        padding: 13
    },
    buttonListItemText: {
        color: '#777',
        fontSize: 18,
        fontWeight: '400',
        textAlign: 'left'
    }
});
