// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';

import {
    Image,
    Text,
    View,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';

import ImageCacheManager from 'app/utils/image_cache_manager';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class TeamIcon extends React.PureComponent {
    static propTypes = {
        displayName: PropTypes.string,
        lastIconUpdate: PropTypes.number,
        teamId: PropTypes.string.isRequired, // eslint-disable-line react/no-unused-prop-types
        styleContainer: PropTypes.any,
        styleText: PropTypes.any,
        styleImage: PropTypes.any,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        const {lastIconUpdate, teamId} = props;
        if (lastIconUpdate) {
            ImageCacheManager.cache('', Client4.getTeamIconUrl(teamId, lastIconUpdate), this.setImageURL);
        }

        this.state = {
            imageError: false,
            teamIcon: null,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.teamId !== this.props.teamId || prevProps.lastIconUpdate !== this.props.lastIconUpdate) {
            ImageCacheManager.cache('', Client4.getTeamIconUrl(this.props.teamId, this.props.lastIconUpdate), this.setImageURL);
        }
    }

    setImageURL = (teamIcon) => {
        this.setState({teamIcon, imageError: false});
    };

    render() {
        const {
            displayName,
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
                    {displayName.substr(0, 2).toUpperCase()}
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
