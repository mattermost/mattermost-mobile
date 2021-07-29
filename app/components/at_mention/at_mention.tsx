// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withTheme} from '@context/theme';
import {ManagedConfig} from '@mattermost/react-native-emm';
import {withManagedConfig} from '@mattermost/react-native-emm/src/context';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import Clipboard from '@react-native-community/clipboard';
import React from 'react';
import {GestureResponderEvent, StyleSheet, Text, TextStyle} from 'react-native';
import {IntlShape, injectIntl} from 'react-intl';

import {MM_TABLES} from '@constants/database';
import {showModal} from '@screens/navigation';
import CompassIcon from '@components/compass_icon';
import {displayUsername, getUsersByUsername} from '@utils/user';

import mattermostManaged from 'app/mattermost_managed';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type AtMentionInputProps = {
    groupsByName: object;
    isSearchResult: boolean;
    mentionKeys: Array<{key: string }>;
    mentionName: string;
    mentionStyle: TextStyle;
    onPostPress: (e: GestureResponderEvent) => void;
    teammateNameDisplay: string;
    textStyle: TextStyle;
}

type AtMentionProps = AtMentionInputProps & {
    intl: IntlShape;
    theme: Theme;
    users: UserModel[];
    managedConfig: ManagedConfig;
}

type AtMentionState = {
    user: object;
}

class ConnectedAtMention extends React.PureComponent<AtMentionProps, AtMentionState> {
    constructor(props: AtMentionProps) {
        super(props);
        const user = this.getUserDetailsFromMentionName();
        this.state = {
            user,
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.mentionName !== prevProps.mentionName || this.props.usersByUsername !== prevProps.usersByUsername) {
            this.updateUsername();
        }
    }

    goToUserProfile = async () => {
        const {intl} = this.context;
        const {theme} = this.props;
        const screen = 'UserProfile';
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: this.state.user.id,
        };

        if (!this.closeButton) {
            this.closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                    testID: 'close.settings.button',
                }],
            },
        };

        showModal(screen, title, passProps, options);
    };

    getUserDetailsFromMentionName() {
        const {mentionName, users} = this.props;
        const usersByUsername = getUsersByUsername(users);
        let mn = mentionName.toLowerCase();

        while (mn.length > 0) {
            if (usersByUsername.hasOwnProperty(mn)) {
                return usersByUsername[mn];
            }

            //fixme: do we really need the below if we just query by username ?
            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mn)) {
                mn = mn.substring(0, mn.length - 1);
            } else {
                break;
            }
        }

        return {
            username: '',
        };
    }

    getGroupFromMentionName() {
        const {groupsByName, mentionName} = this.props;
        const mentionNameTrimmed = mentionName.toLowerCase().replace(/[._-]*$/, '');
        return groupsByName?.[mentionNameTrimmed] || {};
    }

    handleLongPress = async () => {
        const config = mattermostManaged.getCachedConfig();

        if (config?.copyAndPasteProtection !== 'true') {
            //todo: Replace BottomSheet with Slide Up Pannel
            // const cancelText = formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'});
            // const actionText = formatMessage({id: 'mobile.mention.copy_mention', defaultMessage: 'Copy Mention'});
            // BottomSheet.showBottomSheetWithOptions({
            //     options: [actionText, cancelText],
            //     cancelButtonIndex: 1,
            // }, (value) => {
            //     if (value !== 1) {
            //         this.handleCopyMention();
            //     }
            // });
        }
    };

    handleCopyMention = () => {
        const {user} = this.state;
        const {mentionName} = this.props;
        let username = mentionName;
        if (user.username) {
            username = user.username;
        }

        Clipboard.setString(`@${username}`);
    };

    updateUsername = () => {
        const user = this.getUserDetailsFromMentionName();
        this.setState({
            user,
        });
    }

    render() {
        const {isSearchResult, mentionName, mentionStyle, onPostPress, teammateNameDisplay, textStyle, mentionKeys, theme} = this.props;
        const {user} = this.state;
        const mentionTextStyle = [];

        let backgroundColor;
        let canPress = false;
        let highlighted;
        let isMention = false;
        let mention;
        let onLongPress;
        let onPress;
        let suffix;
        let suffixElement;
        let styleText;

        if (textStyle) {
            backgroundColor = theme.mentionHighlightBg;
            styleText = textStyle;
        }

        if (user?.username) {
            suffix = this.props.mentionName.substring(user.username.length);
            highlighted = mentionKeys.some((item) => item.key.includes(user.username));
            mention = displayUsername(user, teammateNameDisplay);
            isMention = true;
            canPress = true;
        } else {
            const group = this.getGroupFromMentionName();
            if (group.allow_reference) {
                highlighted = mentionKeys.some((item) => item.key === `@${group.name}`);
                isMention = true;
                mention = group.name;
                suffix = this.props.mentionName.substring(group.name.length);
            } else {
                const pattern = new RegExp(/\b(all|channel|here)(?:\.\B|_\b|\b)/, 'i');
                const mentionMatch = pattern.exec(mentionName);

                if (mentionMatch) {
                    mention = mentionMatch.length > 1 ? mentionMatch[1] : mentionMatch[0];
                    suffix = mentionName.replace(mention, '');
                    isMention = true;
                    highlighted = true;
                } else {
                    mention = mentionName;
                }
            }
        }

        if (canPress) {
            onLongPress = this.handleLongPress;
            onPress = isSearchResult ? onPostPress : this.goToUserProfile;
        }

        if (suffix) {
            const suffixStyle = {...StyleSheet.flatten(styleText), color: theme.centerChannelColor};
            suffixElement = (
                <Text style={suffixStyle}>
                    {suffix}
                </Text>
            );
        }

        if (isMention) {
            mentionTextStyle.push(mentionStyle);
        }

        if (highlighted) {
            mentionTextStyle.push({backgroundColor, color: theme.mentionHighlightLink});
        }

        return (
            <Text
                style={styleText}
                onPress={onPress}
                onLongPress={onLongPress}
            >
                <Text style={mentionTextStyle}>
                    {'@' + mention}
                </Text>
                {suffixElement}
            </Text>
        );
    }
}

const AtMentionHOC = injectIntl(withTheme(withManagedConfig(ConnectedAtMention)));

const AtMention = withDatabase(withObservables(['mentionName'], ({database}: WithDatabaseArgs & { mentionName: string}) => ({

    //fixme: is it safe to query all the users ?
    users: database.get(MM_TABLES.SERVER.USER).query().observeWithColumns(['username']),
}))(AtMentionHOC));

export default AtMention;
