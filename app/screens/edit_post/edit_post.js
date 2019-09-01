// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Platform,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import ErrorText from 'app/components/error_text';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    setNavigatorStyles,
    getKeyboardAppearanceFromTheme,
} from 'app/utils/theme';
import {t} from 'app/utils/i18n';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

import {RequestStatus} from 'mattermost-redux/constants';

export default class EditPost extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            editPost: PropTypes.func.isRequired,
            setButtons: PropTypes.func.isRequired,
            dismissModal: PropTypes.func.isRequired,
        }),
        componentId: PropTypes.string,
        closeButton: PropTypes.object,
        deviceHeight: PropTypes.number,
        deviceWidth: PropTypes.number,
        editPostRequest: PropTypes.object.isRequired,
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    leftButton = {
        id: 'close-edit-post',
    };

    rightButton = {
        id: 'edit-post',
        showAsAction: 'always',
    };

    constructor(props, context) {
        super(props);

        this.state = {message: props.post.message};
        this.rightButton.color = props.theme.sidebarHeaderTextColor;
        this.rightButton.text = context.intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'});

        props.actions.setButtons(props.componentId, {
            leftButtons: [{...this.leftButton, icon: props.closeButton}],
            rightButtons: [this.rightButton],
        });
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);

        this.focus();
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.componentId, nextProps.theme);
        }

        const {editPostRequest} = nextProps;

        if (this.props.editPostRequest !== editPostRequest) {
            switch (editPostRequest.status) {
            case RequestStatus.STARTED:
                this.emitEditing(true);
                this.setState({error: null, editing: true});
                break;
            case RequestStatus.SUCCESS:
                this.emitEditing(false);
                this.setState({error: null, editing: false});
                this.close();
                break;
            case RequestStatus.FAILURE:
                this.emitEditing(false);
                this.setState({error: editPostRequest.error, editing: false});
                break;
            }
        }
    }

    navigationButtonPressed({buttonId}) {
        switch (buttonId) {
        case 'close-edit-post':
            this.close();
            break;
        case 'edit-post':
            this.onEditPost();
            break;
        }
    }

    close = () => {
        this.props.actions.dismissModal();
    };

    emitCanEditPost = (enabled) => {
        const {actions, componentId} = this.props;
        actions.setButtons(componentId, {
            leftButtons: [{...this.leftButton, icon: this.props.closeButton}],
            rightButtons: [{...this.rightButton, enabled}],
        });
    };

    emitEditing = (loading) => {
        const {actions, componentId} = this.props;
        actions.setButtons(componentId, {
            leftButtons: [{...this.leftButton, icon: this.props.closeButton}],
            rightButtons: [{...this.rightButton, enabled: !loading}],
        });
    };

    focus = () => {
        this.messageInput.focus();
    };

    messageRef = (ref) => {
        this.messageInput = ref;
    };

    onEditPost = () => {
        const {message} = this.state;
        const post = Object.assign({}, this.props.post, {message});
        this.props.actions.editPost(post);
    };

    onPostChangeText = (message) => {
        this.setState({message});
        if (message) {
            this.emitCanEditPost(true);
        } else {
            this.emitCanEditPost(false);
        }
    };

    render() {
        const {deviceHeight, deviceWidth, theme, isLandscape} = this.props;
        const {editing, message, error} = this.state;

        const style = getStyleSheet(theme);

        if (editing) {
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

        const height = Platform.OS === 'android' ? (deviceHeight / 2) - 40 : (deviceHeight / 2);

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.scrollView}>
                    {displayError}
                    <View style={[style.inputContainer, padding(isLandscape), {height}]}>
                        <TextInputWithLocalizedPlaceholder
                            ref={this.messageRef}
                            value={message}
                            blurOnSubmit={false}
                            onChangeText={this.onPostChangeText}
                            multiline={true}
                            numberOfLines={10}
                            style={[style.input, {height}]}
                            autoFocus={true}
                            placeholder={{id: t('edit_post.editPost'), defaultMessage: 'Edit the post...'}}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                            underlineColorAndroid='transparent'
                            disableFullscreenUI={true}
                            keyboardAppearance={getKeyboardAppearanceFromTheme(this.props.theme)}
                        />
                    </View>
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        errorContainer: {
            paddingHorizontal: 10,
        },
        errorWrapper: {
            alignItems: 'center',
        },
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
            marginTop: 2,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 14,
            padding: 15,
            textAlignVertical: 'top',
        },
    };
});
