// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {View} from 'react-native';

import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import Loading from 'app/components/loading';
import ErrorText from 'app/components/error_text';
import StatusBar from 'app/components/status_bar/index';
import ProfilePicture from 'app/components/profile_picture/index';
import AttachmentButton from 'app/components/attachment_button';
import {emptyFunction} from 'app/utils/general';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import EditProfileItem from './edit_profile_item';

const holders = {
    firstName: {
        id: 'user.settings.general.firstName',
        defaultMessage: 'First Name',
    },
    lastName: {
        id: 'user.settings.general.lastName',
        defaultMessage: 'Last Name',
    },
    username: {
        id: 'user.settings.general.username',
        defaultMessage: 'Username',
    },
    nickname: {
        id: 'user.settings.general.nickname',
        defaultMessage: 'Nickname',
    },
    position: {
        id: 'user.settings.general.position',
        defaultMessage: 'Position',
    },
    email: {
        id: 'user.settings.general.email',
        defaultMessage: 'Email',
    },
};

export default class EditProfile extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleUploadProfileImage: PropTypes.func.isRequired,
            updateUser: PropTypes.func.isRequired,
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    rightButton = {
        id: 'update-profile',
        disabled: true,
        showAsAction: 'always',
    };

    constructor(props, context) {
        super(props);

        const {email, first_name: firstName, last_name: lastName, nickname, position, username} = props.currentUser;
        const buttons = {
            rightButtons: [this.rightButton],
        };

        this.rightButton.title = context.intl.formatMessage({id: 'mobile.account.settings.save', defaultMessage: 'Save'});
        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);

        this.state = {
            email,
            firstName,
            lastName,
            nickname,
            position,
            username,
        };
    }

    canUpdate = (updatedField) => {
        const {currentUser} = this.props;
        const keys = Object.keys(this.state);
        const newState = {...this.state, ...(updatedField || {})};
        Reflect.deleteProperty(newState, 'error');
        Reflect.deleteProperty(newState, 'updating');

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let userKey;
            switch (key) {
            case 'firstName':
                userKey = 'first_name';
                break;
            case 'lastName':
                userKey = 'last_name';
                break;
            default:
                userKey = key;
                break;
            }

            if (currentUser[userKey] !== newState[key]) {
                return true;
            }
        }

        return false;
    };

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down',
        });
    };

    emitCanUpdateAccount = (enabled) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: !enabled}],
        };

        this.props.navigator.setButtons(buttons);
    };

    handleRequestError = (error) => {
        this.setState({error, updating: false});
        this.emitCanUpdateAccount(true);
        if (this.scrollView) {
            this.scrollView.props.scrollToPosition(0, 0);
        }
    };

    submitUser = preventDoubleTap(async () => {
        this.emitCanUpdateAccount(false);
        this.setState({error: null, updating: true});

        const {
            profileImage,
            firstName,
            lastName,
            username,
            nickname,
            position,
            email,
        } = this.state;
        const user = {
            first_name: firstName,
            last_name: lastName,
            username,
            nickname,
            position,
            email,
        };

        if (profileImage) {
            const {error} = await this.props.actions.handleUploadProfileImage(profileImage, this.props.currentUser.id);
            if (error) {
                this.handleRequestError(error);
                return;
            }
        }

        if (this.canUpdate()) {
            const {error} = await this.props.actions.updateUser(user);
            if (error) {
                this.handleRequestError(error);
                return;
            }
        }

        this.close();
    });

    handleUploadProfileImage = (images) => {
        const image = images && images.length > 0 && images[0];
        this.setState({profileImage: image});
        this.emitCanUpdateAccount(true);
    };

    updateField = (field) => {
        this.setState(field, () => {
            this.emitCanUpdateAccount(this.canUpdate(field));
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'update-profile':
                this.submitUser();
                break;
            case 'close-settings':
                this.close();
                break;
            }
        }
    };

    renderFirstNameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {firstName} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' && config.LdapFristNameAttributeSet === 'true') ||
            (service === 'saml' && config.SamlFirstNameAttributeSet === 'true');

        return (
            <EditProfileItem
                disabled={disabled}
                field='firstName'
                format={holders.firstName}
                helpText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                updateValue={this.updateField}
                theme={theme}
                value={firstName}
            />
        );
    };

    renderLastNameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {lastName} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' && config.LdapLastNameAttributeSet === 'true') ||
            (service === 'saml' && config.SamlLastNameAttributeSet === 'true');

        return (
            <View>
                <EditProfileItem
                    disabled={disabled}
                    field='lastName'
                    format={holders.lastName}
                    helpText={formatMessage({
                        id: 'user.settings.general.field_handled_externally',
                        defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                    })}
                    updateValue={this.updateField}
                    theme={theme}
                    value={lastName}
                />
            </View>
        );
    };

    renderUsernameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {currentUser, theme} = this.props;
        const {username} = this.state;
        const disabled = currentUser.auth_service !== '';

        return (
            <EditProfileItem
                disabled={disabled}
                field='username'
                format={holders.username}
                helpText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                updateValue={this.updateField}
                theme={theme}
                value={username}
            />
        );
    };

    renderEmailSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {email} = this.state;

        let helpText;
        let disabled = false;

        if (config.SendEmailNotifications !== 'true') {
            disabled = true;
            helpText = formatMessage({
                id: 'user.settings.general.emailHelp1',
                defaultMessage: 'Email is used for sign-in, notifications, and password reset. Email requires verification if changed.',
            });
        } else if (currentUser.auth_service !== '') {
            disabled = true;

            switch (currentUser.auth_service) {
            case 'gitlab':
                helpText = formatMessage({
                    id: 'user.settings.general.emailGitlabCantUpdate',
                    defaultMessage: 'Login occurs through GitLab. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'google':
                helpText = formatMessage({
                    id: 'user.settings.general.emailGoogleCantUpdate',
                    defaultMessage: 'Login occurs through Google Apps. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'office365':
                helpText = formatMessage({
                    id: 'user.settings.general.emailOffice365CantUpdate',
                    defaultMessage: 'Login occurs through Office 365. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'ldap':
                helpText = formatMessage({
                    id: 'user.settings.general.emailLdapCantUpdate',
                    defaultMessage: 'Login occurs through AD/LDAP. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            case 'saml':
                helpText = formatMessage({
                    id: 'user.settings.general.emailSamlCantUpdate',
                    defaultMessage: 'Login occurs through SAML. Email cannot be updated. Email address used for notifications is {email}.',
                }, {email});
                break;
            }
        }

        return (
            <View>
                <EditProfileItem
                    disabled={disabled}
                    field='email'
                    format={holders.email}
                    helpText={helpText}
                    updateValue={this.updateField}
                    theme={theme}
                    value={email}
                />
            </View>
        );
    };

    renderNicknameSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {nickname} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' && config.LdapNicknameAttributeSet === 'true') ||
            (service === 'saml' && config.SamlNicknameAttributeSet === 'true');

        return (
            <EditProfileItem
                disabled={disabled}
                field='nickname'
                format={holders.nickname}
                helpText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                updateValue={this.updateField}
                theme={theme}
                value={nickname}
            />
        );
    };

    renderPositionSettings = () => {
        const {formatMessage} = this.context.intl;
        const {config, currentUser, theme} = this.props;
        const {position} = this.state;

        const {auth_service: service} = currentUser;
        const disabled = (service === 'ldap' || service === 'saml') && config.PositionAttribute === 'true';

        return (
            <EditProfileItem
                disabled={disabled}
                field='position'
                format={holders.position}
                helpText={formatMessage({
                    id: 'user.settings.general.field_handled_externally',
                    defaultMessage: 'This field is handled through your login provider. If you want to change it, you need to do so through your login provider.',
                })}
                updateValue={this.updateField}
                theme={theme}
                value={position}
            />
        );
    };

    scrollViewRef = (ref) => {
        this.scrollView = ref;
    };

    render() {
        const {
            currentUser,
            theme,
            navigator,
        } = this.props;

        const {
            profileImage,
            error,
            updating,
        } = this.state;

        const style = getStyleSheet(theme);
        const uri = profileImage ? profileImage.uri : null;

        if (updating) {
            return (
                <View style={[style.container, style.flex]}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        }

        let displayError;
        if (error) {
            displayError = (
                <View style={style.errorContainer}>
                    <View style={style.errorWrapper}>
                        <ErrorText
                            error={error}
                            textStyle={style.errorText}
                        />
                    </View>
                </View>
            );
        }

        return (
            <View style={style.flex}>
                <StatusBar/>
                <KeyboardAwareScrollView
                    bounces={false}
                    innerRef={this.scrollViewRef}
                    style={style.container}
                >
                    {displayError}
                    <View style={[style.scrollView]}>
                        <View style={style.top}>
                            <AttachmentButton
                                blurTextBox={emptyFunction}
                                theme={theme}
                                navigator={navigator}
                                wrapper={true}
                                uploadFiles={this.handleUploadProfileImage}
                            >
                                <ProfilePicture
                                    userId={currentUser.id}
                                    size={150}
                                    statusBorderWidth={6}
                                    statusSize={40}
                                    edit={true}
                                    imageUri={uri}
                                />
                            </AttachmentButton>
                        </View>
                        {this.renderFirstNameSettings()}
                        <View style={style.separator}/>
                        {this.renderLastNameSettings()}
                        <View style={style.separator}/>
                        {this.renderUsernameSettings()}
                        <View style={style.separator}/>
                        {this.renderEmailSettings()}
                        <View style={style.separator}/>
                        {this.renderNicknameSettings()}
                        <View style={style.separator}/>
                        {this.renderPositionSettings()}
                        <View style={style.footer}/>
                    </View>
                </KeyboardAwareScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        container: {
            backgroundColor: theme.centerChannelBg,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 10,
        },
        top: {
            padding: 25,
            alignItems: 'center',
            justifyContent: 'center',
        },
        errorContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            width: '100%',
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        errorText: {
            fontSize: 14,
        },
        separator: {
            height: 15,
        },
        footer: {
            height: 40,
            width: '100%',
        },
    };
});

