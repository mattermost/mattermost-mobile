// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';

import {
    Text,
    Image,
    View,
} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import {Client4} from 'mattermost-redux/client';

export default class TeamIcon extends React.PureComponent {
    static propTypes = {
        teamId: PropTypes.string.isRequired, // eslint-disable-line react/no-unused-prop-types
        styleContainer: PropTypes.any,
        styleText: PropTypes.any,
        styleImage: PropTypes.any,
        team: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    state = {
        imageError: false,
    };

    componentWillReceiveProps() {
        this.setState({imageError: false});
    }

    render() {
        const {
            team,
            theme,
            styleContainer,
            styleText,
            styleImage,
        } = this.props;

        const styles = getStyleSheet(theme);

        let teamIconContent;
        if (team.last_team_icon_update && !this.state.imageError) {
            const teamIconUrl = Client4.getTeamIconUrl(team.id, team.last_team_icon_update);
            teamIconContent = (
                <Image
                    style={[styles.image, styleImage]}
                    source={{uri: teamIconUrl, headers: {Authorization: `Bearer ${Client4.getToken()}`}}}
                    onError={() => this.setState({imageError: true})}
                />
            );
        } else {
            teamIconContent = (
                <Text style={[styles.text, styleText]}>
                    {team.display_name.substr(0, 2).toUpperCase()}
                </Text>
            );
        }

        return (
            <View style={[styles.container, styleContainer]}>
                {teamIconContent}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: 30,
            height: 30,
            borderRadius: 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.sidebarText,
        },
        text: {
            color: theme.sidebarBg,
            fontFamily: 'OpenSans',
            fontWeight: '600',
            fontSize: 15,
        },
        image: {
            borderRadius: 2,
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        },
    };
});
