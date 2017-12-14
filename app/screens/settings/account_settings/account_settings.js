// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    View,
    Platform,
    InteractionManager,
    TouchableWithoutFeedback
} from 'react-native';

import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {RequestStatus} from 'mattermost-redux/constants';

import Loading from 'app/components/loading';
import ErrorText from 'app/components/error_text';
import StatusBar from 'app/components/status_bar/index';
import ProfilePicture from 'app/components/profile_picture/index';
import AttachmentButton from 'app/components/attachment_button';
import SettingsItem from './account_settings_item';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const holders = {
    fullName: {
        id: 'user.settings.general.fullName',
        defaultMessage: 'Full Name'
    },
    username: {
        id: 'user.settings.general.username',
        defaultMessage: 'Username'
    },
    nickname: {
        id: 'user.settings.general.nickname',
        defaultMessage: 'Nickname'
    },
    position: {
        id: 'user.settings.general.position',
        defaultMessage: 'Position'
    },
    email: {
        id: 'user.settings.general.email',
        defaultMessage: 'Email'
    }
};

export default class AccountSettings extends PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        config: PropTypes.object.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        currentUser: PropTypes.object.isRequired,
        updateRequest: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            handleUploadProfileImage: PropTypes.func.isRequired,
            updateUser: PropTypes.func.isRequired
        }).isRequired
    };

    static contextTypes = {
        intl: intlShape.isRequired
    };

    rightButton = {
        id: 'update-profile',
        disabled: true,
        showAsAction: 'always'
    };

    constructor(props, context) {
        super(props);

        const {
            currentUser,
            currentUser: {
                first_name: firstName,
                last_name: lastName,
                auth_service
            }
        } = props;
        const authService = auth_service.toLowerCase();

        // TODO: fullName edit support, may be problematic since db stores first and last name separately
        let fullName = '';
        if (firstName && lastName) {
            fullName = `${firstName} ${lastName}`;
        } else if (firstName) {
            fullName = firstName;
        }

        this.state = {
            fullName,
            firstName,
            lastName,
            username: currentUser.username,
            nickname: currentUser.nickname,
            position: currentUser.position,
            email: currentUser.email,
            authService
        };

        this.rightButton.title = context.intl.formatMessage({id: 'mobile.account.settings.save', defaultMessage: 'Save'});

        const buttons = {
            rightButtons: [this.rightButton]
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentWillReceiveProps(nextProps) {
        const {updateRequest} = nextProps;

        if (this.props.updateRequest !== updateRequest) {
            switch (updateRequest.status) {
            case RequestStatus.STARTED:
                this.emitCanUpdateAccount(false);
                this.setState({error: null, updating: true});
                break;
            case RequestStatus.SUCCESS:
                InteractionManager.runAfterInteractions(() => {
                    this.emitCanUpdateAccount(true);
                    this.setState({error: null, updating: false});
                    this.close();
                });
                break;
            case RequestStatus.FAILURE:
                this.emitCanUpdateAccount(true);
                this.setState({error: updateRequest.error, updating: false});
                break;
            }
        }
    }

    close = () => {
        this.props.navigator.pop({animated: true});
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'update-profile':
                this.submitUser();
                break;
            }
        }
    };

    emitCanUpdateAccount = (enabled) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: !enabled}]
        };

        this.props.navigator.setButtons(buttons);
    };

    submitUser() {
        const {
            profileImage,
            firstName,
            lastName,
            username,
            nickname,
            position,
            email
        } = this.state;
        const user = {
            first_name: firstName,
            last_name: lastName,
            username,
            nickname,
            position,
            email
        };

        // TODO: have 1 request instead of 2
        // since these request are in one screen and is triggered by the save action button,
        // having to deal with 2 results can get complicated. see account_settings/index.js
        if (profileImage) {
            this.props.actions.handleUploadProfileImage(profileImage, this.props.currentUser.id);
        }

        if (this.canUpdate()) {
            this.props.actions.updateUser(user);
        }
    }

    handleUploadProfileImage = (images) => {
        const image = images && images.length > 0 && images[0];
        this.setState({profileImage: image});
        this.emitCanUpdateAccount(true);
    };

    updateField = (field) => {
        this.setState(field);
        this.emitCanUpdateAccount(this.canUpdate(field));
    };

    canUpdate = (updatedField) => {
        const {
            firstName,
            lastName,
            username,
            nickname,
            position,
            email
        } = this.state;
        const {
            currentUser: {
                first_name: oldFirstName,
                last_name: oldLastName,
                username: oldUsername,
                nickname: oldNickname,
                position: oldPosition,
                email: oldEmail
            }
        } = this.props;

        const fields = {
            firstName,
            lastName,
            username,
            nickname,
            position,
            email,
            ...updatedField
        };

        const oldFields = {
            firstName: oldFirstName,
            lastName: oldLastName,
            username: oldUsername,
            nickname: oldNickname,
            position: oldPosition,
            email: oldEmail
        };

        return fields.firstName !== oldFields.firstName ||
            fields.lastName !== oldFields.lastName ||
            fields.username !== oldFields.username ||
            fields.nickname !== oldFields.nickname ||
            fields.position !== oldFields.position ||
            fields.email !== oldFields.email;
    };

    canEdit = () => {
        const {authService} = this.state;

        return authService !== 'ldap' && authService !== 'saml';
    };

    renderNameSettings = () => {
        const {theme} = this.props;
        const {fullName} = this.state;

        return (
            <View>
                <SettingsItem
                    theme={theme}
                    value={fullName}
                    updateValue={(value) => this.updateField({fullName: value})}
                    format={holders.fullName}
                    editable={this.canEdit()}
                />
            </View>
        );
    };

    renderUsernameSettings = () => {
        const {theme} = this.props;
        const {username} = this.state;

        return (
            <SettingsItem
                theme={theme}
                value={username}
                updateValue={(value) => this.updateField({username: value})}
                format={holders.username}
                editable={this.canEdit()}
            />
        );
    };

    renderEmailSettings = () => {
        const {theme} = this.props;
        const {email} = this.state;

        return (
            <View>
                <SettingsItem
                    theme={theme}
                    value={email}
                    updateValue={(value) => this.updateField({email: value})}
                    format={holders.email}
                    editable={this.canEdit()}
                />
            </View>
        );
    };

    renderNicknameSettings = () => {
        const {theme} = this.props;
        const {nickname} = this.state;

        return (
            <SettingsItem
                theme={theme}
                value={nickname}
                updateValue={(value) => this.updateField({nickname: value})}
                format={holders.nickname}
                optional={true}
                editable={this.canEdit()}
            />
        );
    };

    renderPositionSettings = () => {
        const {theme} = this.props;
        const {position} = this.state;

        return (
            <SettingsItem
                theme={theme}
                value={position}
                updateValue={(value) => this.updateField({position: value})}
                format={holders.position}
                optional={true}
                editable={this.canEdit()}
            />
        );
    };

    render() {
        const {
            currentUser: {
                id
            },
            deviceWidth,
            deviceHeight,
            theme,
            navigator
        } = this.props;
        const {
            profileImage,
            nickname,
            position,
            error,
            updating
        } = this.state;
        const style = getStyleSheet(theme);

        if (updating) {
            return (
                <View style={style.container}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        }

        let displayError;
        if (error) {
            displayError = (
                <View style={[style.errorContainer, {width: deviceWidth}]}>
                    <View style={style.errorWrapper}>
                        <ErrorText error={error}/>
                    </View>
                </View>
            );
        }

        const fields = [];
        const canEdit = this.canEdit();
        const nicknameValid = nickname && nickname !== '';
        const positionValid = position && position !== '';

        fields.push({
            id: 'fullName',
            render: this.renderNameSettings
        });
        fields.push({
            id: 'username',
            render: this.renderUsernameSettings
        });
        fields.push({
            id: 'email',
            render: this.renderEmailSettings
        });

        if (canEdit || (!canEdit && nicknameValid)) {
            fields.push({
                id: 'nickname',
                render: this.renderNicknameSettings
            });
        }

        if (canEdit || (!canEdit && positionValid)) {
            fields.push({
                id: 'position',
                render: this.renderPositionSettings
            });
        }

        return (
            <View style={{flex: 1}}>
                <StatusBar/>
                <KeyboardAwareScrollView
                    ref={this.scrollRef}
                    style={style.container}
                >
                    {displayError}
                    <TouchableWithoutFeedback onPress={() => true}>
                        <View style={[style.scrollView, {height: deviceHeight + (Platform.OS === 'android' ? 200 : 0)}]}>
                            <View style={style.top}>
                                <AttachmentButton
                                    blurTextBox={() => true}
                                    theme={theme}
                                    navigator={navigator}
                                    wrapper={true}
                                    uploadFiles={this.handleUploadProfileImage}
                                >
                                    <ProfilePicture
                                        userId={id}
                                        size={150}
                                        statusBorderWidth={6}
                                        statusSize={40}
                                        edit={true}
                                        imageUri={profileImage && profileImage.uri}
                                    />
                                </AttachmentButton>
                            </View>
                            {fields.map((field) => (
                                <View key={field.id}>
                                    {field.render()}
                                    <View style={style.separator}/>
                                </View>
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAwareScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 10
        },
        top: {
            padding: 25,
            alignItems: 'center',
            justifyContent: 'center'
        },
        errorContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03)
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center'
        },
        helpText: {
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginTop: 10,
            marginHorizontal: 15
        },
        separator: {
            height: 15
        }
    };
});

