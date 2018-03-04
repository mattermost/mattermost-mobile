// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {getFullName} from 'mattermost-redux/utils/user_utils';
import {General} from 'mattermost-redux/constants';
import {injectIntl, intlShape} from 'react-intl';

import Loading from 'app/components/loading';
import ProfilePicture from 'app/components/profile_picture';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

class ChannelIntro extends PureComponent {
    static propTypes = {
        creator: PropTypes.object,
        currentChannel: PropTypes.object.isRequired,
        currentChannelMembers: PropTypes.array.isRequired,
        intl: intlShape.isRequired,
        isLoadingPosts: PropTypes.bool,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    goToUserProfile = (userId) => {
        const {intl, navigator, theme} = this.props;
        const options = {
            screen: 'UserProfile',
            title: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId,
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        };

        if (Platform.OS === 'ios') {
            navigator.push(options);
        } else {
            navigator.showModal(options);
        }
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
            <TouchableOpacity
                key={member.id}
                onPress={preventDoubleTap(() => this.goToUserProfile(member.id))}
                style={style.profile}
            >
                <ProfilePicture
                    userId={member.id}
                    size={64}
                    statusBorderWidth={2}
                    statusSize={25}
                />
            </TouchableOpacity>
        ));
    };

    buildNames = () => {
        const {currentChannelMembers, theme} = this.props;
        const style = getStyleSheet(theme);

        return currentChannelMembers.map((member, index) => (
            <TouchableOpacity
                key={member.id}
                onPress={preventDoubleTap(() => this.goToUserProfile(member.id))}
            >
                <Text style={style.displayName}>
                    {index === currentChannelMembers.length - 1 ? this.getDisplayName(member) : `${this.getDisplayName(member)}, `}
                </Text>
            </TouchableOpacity>
        ));
    };

    buildDMContent = () => {
        const {currentChannelMembers, intl, theme} = this.props;
        const style = getStyleSheet(theme);

        if (currentChannelMembers.length) {
            const teammate = this.getDisplayName(currentChannelMembers[0]);

            return (
                <Text style={style.message}>
                    {intl.formatMessage({
                        id: 'mobile.intro_messages.DM',
                        defaultMessage: 'This is the start of your direct message history with {teammate}. Direct messages and files shared here are not shown to people outside this area.',
                    }, {
                        teammate,
                    })}
                </Text>
            );
        }

        return null;
    };

    buildGMContent = () => {
        const {intl, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Text style={style.message}>
                {intl.formatMessage({
                    id: 'intro_messages.group_message',
                    defaultMessage: 'This is the start of your group message history with these teammates. Messages and files shared here are not shown to people outside this area.',
                })}
            </Text>
        );
    };

    buildOpenChannelContent = () => {
        const {creator, currentChannel, intl, theme} = this.props;
        const style = getStyleSheet(theme);

        const date = intl.formatDate(currentChannel.create_at, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        let mainMessageIntl;
        if (creator) {
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
                        defaultMessage: 'channel',
                    }),
                },
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
                        defaultMessage: 'channel',
                    }),
                },
            };
        }

        const mainMessage = intl.formatMessage({
            id: mainMessageIntl.id,
            defaultMessage: mainMessageIntl.defaultMessage,
        }, mainMessageIntl.values);

        const anyMemberMessage = intl.formatMessage({
            id: 'intro_messages.anyMember',
            defaultMessage: ' Any member can join and read this channel.',
        });

        return (
            <View>
                <Text style={style.channelTitle}>
                    {intl.formatMessage({
                        id: 'intro_messages.beginning',
                        defaultMessage: 'Beginning of {name}',
                    }, {
                        name: currentChannel.display_name,
                    })}
                </Text>
                <Text style={style.message}>
                    {`${mainMessage} ${anyMemberMessage}`}
                </Text>
            </View>
        );
    };

    buildPrivateChannelContent = () => {
        const {creator, currentChannel, intl, theme} = this.props;
        const style = getStyleSheet(theme);

        const creatorName = this.getDisplayName(creator);
        const date = intl.formatDate(currentChannel.create_at, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const mainMessage = intl.formatMessage({
            id: 'intro_messages.creator',
            defaultMessage: 'This is the start of the {name} {type}, created by {creator} on {date}.',
        }, {
            name: currentChannel.display_name,
            creator: creatorName,
            date,
            type: intl.formatMessage({
                id: 'intro_messages.group',
                defaultMessage: 'private channel',
            }),
        });

        const onlyInvitedMessage = intl.formatMessage({
            id: 'intro_messages.onlyInvited',
            defaultMessage: ' Only invited members can see this private channel.',
        });

        return (
            <View>
                <Text style={style.channelTitle}>
                    {intl.formatMessage({
                        id: 'intro_messages.beginning',
                        defaultMessage: 'Beginning of {name}',
                    }, {
                        name: currentChannel.display_name,
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
                        defaultMessage: 'Beginning of {name}',
                    }, {
                        name: currentChannel.display_name,
                    })}
                </Text>
                <Text style={style.channelWelcome}>
                    {intl.formatMessage({
                        id: 'mobile.intro_messages.default_welcome',
                        defaultMessage: 'Welcome to {name}!',
                    }, {
                        name: currentChannel.display_name,
                    })}
                </Text>
                <Text style={style.message}>
                    {intl.formatMessage({
                        id: 'mobile.intro_messages.default_message',
                        defaultMessage: 'This is the first channel teammates see when they sign up - use it for posting updates everyone needs to know.',
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
        const {currentChannel, isLoadingPosts, theme} = this.props;
        const style = getStyleSheet(theme);
        const channelType = currentChannel.type;

        if (isLoadingPosts) {
            return (
                <View style={style.container}>
                    <Loading/>
                </View>
            );
        }

        let profiles;
        if (channelType === General.DM_CHANNEL || channelType === General.GM_CHANNEL) {
            profiles = (
                <View>
                    <View style={style.profilesContainer}>
                        {this.buildProfiles()}
                    </View>
                    <View style={style.namesContainer}>
                        {this.buildNames()}
                    </View>
                </View>
            );
        }

        return (
            <View style={style.container}>
                {profiles}
                <View style={style.contentContainer}>
                    {this.buildContent()}
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        channelTitle: {
            color: theme.centerChannelColor,
            fontSize: 19,
            fontWeight: '600',
            marginBottom: 12,
        },
        channelWelcome: {
            color: theme.centerChannelColor,
            marginBottom: 12,
        },
        container: {
            marginTop: 60,
            marginHorizontal: 12,
            marginBottom: 12,
        },
        displayName: {
            color: theme.centerChannelColor,
            fontSize: 15,
            fontWeight: '600',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 15,
            lineHeight: 22,
        },
        namesContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: 12,
        },
        profile: {
            height: 67,
            marginBottom: 12,
            marginRight: 12,
        },
        profilesContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
        },
    };
});

export default injectIntl(ChannelIntro);
