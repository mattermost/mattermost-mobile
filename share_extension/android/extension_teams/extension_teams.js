// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {NavigationActions} from 'react-navigation';
import {
    ActivityIndicator,
    FlatList,
    View,
} from 'react-native';

import {Preferences} from 'mattermost-redux/constants';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import TeamItem from './team_item';

const defaultTheme = Preferences.THEMES.default;

export default class ExtensionTeam extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            extensionSelectTeamId: PropTypes.func.isRequired,
            getTeamChannels: PropTypes.func.isRequired,
        }).isRequired,
        navigation: PropTypes.object.isRequired,
        teamIds: PropTypes.array,
    };

    static defaultProps = {
        teamIds: [],
    };

    static contextTypes = {
        intl: intlShape,
    };

    static navigationOptions = ({navigation}) => ({
        title: navigation.state.params.title,
    });

    state = {
        loading: false,
    };

    handleSelectTeam = async (teamId) => {
        const {state} = this.props.navigation;
        const backAction = NavigationActions.back();

        if (state.params && state.params.onSelectTeam) {
            this.setState({loading: true});
            const channelId = await this.props.actions.getTeamChannels(teamId);
            this.props.actions.extensionSelectTeamId(teamId);
            state.params.onSelectTeam(teamId, channelId);
        }

        this.props.navigation.dispatch(backAction);
    };

    keyExtractor = (item) => item;

    renderItemSeparator = () => {
        const styles = getStyleSheet(defaultTheme);

        return (
            <View style={styles.separator}/>
        );
    };

    renderItem = ({item}) => {
        const {navigation} = this.props;
        const {params} = navigation.state;

        return (
            <TeamItem
                currentTeamId={params.currentTeamId}
                onSelectTeam={this.handleSelectTeam}
                teamId={item}
                theme={defaultTheme}
            />
        );
    };

    render() {
        const styles = getStyleSheet(defaultTheme);

        if (this.state.loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator/>
                </View>
            );
        }

        return (
            <FlatList
                data={this.props.teamIds}
                ItemSeparatorComponent={this.renderItemSeparator}
                renderItem={this.renderItem}
                keyExtractor={this.keyExtractor}
                keyboardShouldPersistTaps='always'
                keyboardDismissMode='on-drag'
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                scrollEventThrottle={100}
                windowSize={5}
            />
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        loadingContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
    };
});
