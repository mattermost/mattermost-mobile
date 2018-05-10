// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';

import {
    Image,
    Platform,
    Text,
    View,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';

import ImageCacheManager from 'app/utils/image_cache_manager';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class TeamIcon extends React.PureComponent {
    static propTypes = {
        teamId: PropTypes.string.isRequired, // eslint-disable-line react/no-unused-prop-types
        styleContainer: PropTypes.any,
        styleText: PropTypes.any,
        styleImage: PropTypes.any,
        team: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        const {team} = props;
        if (team.last_team_icon_update) {
            ImageCacheManager.cache('', Client4.getTeamIconUrl(team.id, team.last_team_icon_update), this.setImageURL);
        }

        this.state = {
            teamIcon: null,
            imageError: false,
        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState({imageError: false});

        if (this.props.team.last_team_icon_update !== nextProps.team.last_team_icon_update) {
            const {team} = nextProps;
            ImageCacheManager.cache('', Client4.getTeamIconUrl(team.id, team.last_team_icon_update), this.setImageURL);
        }
    }

    setImageURL = (teamIcon) => {
        let prefix = '';
        if (Platform.OS === 'android') {
            prefix = 'file://';
        }

        this.setState({teamIcon: `${prefix}${teamIcon}`});
    };

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
        if (this.state.teamIcon) {
            teamIconContent = (
                <Image
                    style={[styles.image, styleImage]}
                    source={{uri: this.state.teamIcon}}
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
