// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Clipboard, Text} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {displayUsername} from '@mm-redux/utils/user_utils';

import CustomPropTypes from 'app/constants/custom_prop_types';
import mattermostManaged from 'app/mattermost_managed';
import BottomSheet from 'app/utils/bottom_sheet';
import {showModal} from 'app/actions/navigation';

export default class AtMention extends React.PureComponent {
    static propTypes = {
        isSearchResult: PropTypes.bool,
        mentionKeys: PropTypes.array.isRequired,
        mentionName: PropTypes.string.isRequired,
        mentionStyle: CustomPropTypes.Style,
        onPostPress: PropTypes.func,
        textStyle: CustomPropTypes.Style,
        teammateNameDisplay: PropTypes.string,
        theme: PropTypes.object.isRequired,
        usersByUsername: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
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
            this.closeButton = await MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
        };

        showModal(screen, title, passProps, options);
    };

    getUserDetailsFromMentionName() {
        const {usersByUsername} = this.props;
        let mentionName = this.props.mentionName.toLowerCase();

        while (mentionName.length > 0) {
            if (usersByUsername.hasOwnProperty(mentionName)) {
                return usersByUsername[mentionName];
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mentionName)) {
                mentionName = mentionName.substring(0, mentionName.length - 1);
            } else {
                break;
            }
        }

        return {
            username: '',
        };
    }

    handleLongPress = async () => {
        const {formatMessage} = this.context.intl;

        const config = mattermostManaged.getCachedConfig();

        if (config?.copyAndPasteProtection !== 'true') {
            const cancelText = formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'});
            const actionText = formatMessage({id: 'mobile.mention.copy_mention', defaultMessage: 'Copy Mention'});

            BottomSheet.showBottomSheetWithOptions({
                options: [actionText, cancelText],
                cancelButtonIndex: 1,
            }, (value) => {
                if (value !== 1) {
                    this.handleCopyMention();
                }
            });
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
        const {isSearchResult, mentionName, mentionStyle, onPostPress, teammateNameDisplay, textStyle, mentionKeys} = this.props;
        const {user} = this.state;

        if (!user.username) {
            return <Text style={textStyle}>{'@' + mentionName}</Text>;
        }

        const suffix = this.props.mentionName.substring(user.username.length);
        const highlighted = mentionKeys.some((item) => item.key === user.username);

        return (
            <Text
                style={textStyle}
                onPress={isSearchResult ? onPostPress : this.goToUserProfile}
                onLongPress={this.handleLongPress}
            >
                <Text style={highlighted ? null : mentionStyle}>
                    {'@' + displayUsername(user, teammateNameDisplay)}
                </Text>
                {suffix}
            </Text>
        );
    }
}
