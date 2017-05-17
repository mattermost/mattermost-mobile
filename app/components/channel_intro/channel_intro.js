// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';
import {getFullName} from 'mattermost-redux/utils/user_utils';
import {General} from 'mattermost-redux/constants';
import {injectIntl, intlShape} from 'react-intl';

import ProfilePicture from 'app/components/profile_picture';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

class ChannelIntro extends PureComponent {
    static propTypes = {
        currentChannel: PropTypes.object.isRequired,
        currentChannelMembers: PropTypes.array.isRequired,
        currentUser: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        theme: PropTypes.object.isRequired
    };

    getDisplayName = (member) => {
        if (!member) {
            return null;
        }

        const displayName = getFullName(member);

        if (!displayName) {
            return member.username;
        }

        return displayName;
    };

    buildProfiles = () => {
        const {currentChannelMembers, theme} = this.props;
        const style = getStyleSheet(theme);

        return currentChannelMembers.map((member) => (
            <View
                key={member.id}
                style={style.profile}
            >
                <ProfilePicture
                    user={member}
                    size={64}
                    statusBorderWidth={2}
                    statusSize={25}
                    statusIconSize={15}
                />
            </View>
        ));
    };

    buildNames = () => {
        const {currentChannelMembers, theme} = this.props;
        const style = getStyleSheet(theme);

        const names = currentChannelMembers.map((member) => this.getDisplayName(member));

        return <Text style={style.displayName}>{names.join(', ')}</Text>;
    };

    buildDMContent = () => {
        const {currentChannelMembers, intl, theme} = this.props;
        const style = getStyleSheet(theme);
        const teammate = this.getDisplayName(currentChannelMembers[0]);

        return (
            <Text style={style.message}>
                {intl.formatMessage({
                    id: 'mobile.intro_messages.DM',
                    defaultMessage: 'This is the start of your direct message history with {teammate}. Direct messages and files shared here are not shown to people outside this area.'
                }, {
                    teammate
                })}
            </Text>
        );
    };

    buildGMContent = () => {
        const {intl, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Text style={style.message}>
                {intl.formatMessage({
                    id: 'intro_messages.group_message',
                    defaultMessage: 'This is the start of your group message history with these teammates. Messages and files shared here are not shown to people outside this area.'
                })}
            </Text>
        );
    };

    buildOpenChannelContent = () => {
        const {currentChannel, currentChannelMembers, currentUser, intl, theme} = this.props;
        const style = getStyleSheet(theme);

        const date = intl.formatDate(currentChannel.create_at, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let mainMessageIntl;
        if (currentChannel.creator_id) {
            const creator = currentChannel.creator_id === currentUser.id ? currentUser : currentChannelMembers[currentChannel.creator_id];
            const creatorName = this.getDisplayName(creator);
            mainMessageIntl = {
                id: 'intro_messages.creator',
                defaultMessage: 'This is the start of the {name} {type}, created by {creator} on {date}.',
                values: {
                    name: currentChannel.display_name,
                    creator: creatorName,
                    date,
                    type: intl.formatMessage({
                        id: 'intro_messages.channel',
                        defaultMessage: 'channel'
                    })
                }
            };
        } else {
            mainMessageIntl = {
                id: 'intro_messages.noCreator',
                defaultMessage: 'This is the start of the {name} {type}, created on {date}.',
                values: {
                    name: currentChannel.display_name,
                    date,
                    type: intl.formatMessage({
                        id: 'intro_messages.channel',
                        defaultMessage: 'channel'
                    })
                }
            };
        }

        const mainMessage = intl.formatMessage({
            id: mainMessageIntl.id,
            defaultMessage: mainMessageIntl.defaultMessage
        }, mainMessageIntl.values);

        const anyMemberMessage = intl.formatMessage({
            id: 'intro_messages.anyMember',
            defaultMessage: ' Any member can join and read this channel.'
        });

        return (
            <View>
                <Text style={style.channelTitle}>
                    {intl.formatMessage({
                        id: 'intro_messages.beginning',
                        defaultMessage: 'Beginning of {name}'
                    }, {
                        name: currentChannel.display_name
                    })}
                </Text>
                <Text style={style.message}>
                    {`${mainMessage} ${anyMemberMessage}`}
                </Text>
            </View>
        );
    };

    buildPrivateChannelContent = () => {
        const {currentChannel, currentChannelMembers, currentUser, intl, theme} = this.props;
        const style = getStyleSheet(theme);

        const creator = currentChannel.creator_id === currentUser.id ? currentUser : currentChannelMembers[currentChannel.creator_id];
        const creatorName = this.getDisplayName(creator);
        const date = intl.formatDate(currentChannel.create_at, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const mainMessage = intl.formatMessage({
            id: 'intro_messages.creator',
            defaultMessage: 'This is the start of the {name} {type}, created by {creator} on {date}.'
        }, {
            name: currentChannel.display_name,
            creator: creatorName,
            date,
            type: intl.formatMessage({
                id: 'intro_messages.group',
                defaultMessage: 'private channel'
            })
        });

        const onlyInvitedMessage = intl.formatMessage({
            id: 'intro_messages.onlyInvited',
            defaultMessage: ' Only invited members can see this private channel.'
        });

        return (
            <View>
                <Text style={style.channelTitle}>
                    {intl.formatMessage({
                        id: 'intro_messages.beginning',
                        defaultMessage: 'Beginning of {name}'
                    }, {
                        name: currentChannel.display_name
                    })}
                </Text>
                <Text style={style.message}>
                    {`${mainMessage} ${onlyInvitedMessage}`}
                </Text>
            </View>
        );
    };

    buildTownSquareContent = () => {
        const {currentChannel, intl, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View>
                <Text style={style.channelTitle}>
                    {intl.formatMessage({
                        id: 'intro_messages.beginning',
                        defaultMessage: 'Beginning of {name}'
                    }, {
                        name: currentChannel.display_name
                    })}
                </Text>
                <Text style={style.channelWelcome}>
                    {intl.formatMessage({
                        id: 'mobile.intro_messages.default_welcome',
                        defaultMessage: 'Welcome to {name}!'
                    }, {
                        name: currentChannel.display_name
                    })}
                </Text>
                <Text style={style.message}>
                    {intl.formatMessage({
                        id: 'mobile.intro_messages.default_message',
                        defaultMessage: 'This is the first channel teammates see when they sign up - use it for posting updates everyone needs to know.'
                    })}
                </Text>
            </View>
        );
    };

    buildContent = () => {
        const {currentChannel} = this.props;

        switch (currentChannel.type) {
        default:
        case General.DM_CHANNEL:
            return this.buildDMContent();

        case General.GM_CHANNEL:
            return this.buildGMContent();

        case General.OPEN_CHANNEL: {
            if (currentChannel.name === General.DEFAULT_CHANNEL) {
                return this.buildTownSquareContent();
            }

            return this.buildOpenChannelContent();
        }

        case General.PRIVATE_CHANNEL:
            return this.buildPrivateChannelContent();

        }
    };

    render() {
        const {theme} = this.props;

        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <View style={style.profilesContainer}>
                    {this.buildProfiles()}
                </View>
                <View style={style.namesContainer}>
                    {this.buildNames()}
                </View>
                <View style={style.contentContainer}>
                    {this.buildContent()}
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        channelTitle: {
            color: theme.centerChannelColor,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 12
        },
        channelWelcome: {
            color: theme.centerChannelColor,
            marginBottom: 12
        },
        container: {
            marginTop: 60,
            marginHorizontal: 12,
            marginBottom: 12
        },
        displayName: {
            color: theme.centerChannelColor,
            fontSize: 15,
            fontWeight: '600'
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            lineHeight: 18
        },
        namesContainer: {
            marginBottom: 12
        },
        profile: {
            marginRight: 12
        },
        profilesContainer: {
            flexDirection: 'row',
            marginBottom: 12
        }
    });
});

export default injectIntl(ChannelIntro);
