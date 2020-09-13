// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {CommonActions as NavigationActions} from '@react-navigation/native';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

import {
    Alert,
    NativeModules,
    PermissionsAndroid,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Video from 'react-native-video';
import LocalAuth from 'react-native-local-auth';
import RNFetchBlob from 'rn-fetch-blob';

import {Client4} from '@mm-redux/client';
import {Preferences} from '@mm-redux/constants';
import {getFormattedFileSize, lookupMimeType} from '@mm-redux/utils/file_utils';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import {MAX_FILE_COUNT, MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {getCurrentServerUrl, getAppCredentials} from '@init/credentials';
import {getExtensionFromMime} from '@utils/file';
import {setCSRFFromCookie} from '@utils/security';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import mattermostManaged from 'app/mattermost_managed';

import {
    ExcelSvg,
    GenericSvg,
    PdfSvg,
    PptSvg,
    ZipSvg,
} from 'share_extension/common/icons';

import ChannelButton from './channel_button';
import TeamButton from './team_button';

const defaultTheme = Preferences.THEMES.default;
const extensionSvg = {
    csv: ExcelSvg,
    pdf: PdfSvg,
    ppt: PptSvg,
    pptx: PptSvg,
    xls: ExcelSvg,
    xlsx: ExcelSvg,
    zip: ZipSvg,
};
const ShareExtension = NativeModules.MattermostShare;
const INPUT_HEIGHT = 150;

export default class ExtensionPost extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string,
        channels: PropTypes.object.isRequired,
        currentUserId: PropTypes.string.isRequired,
        getTeamChannels: PropTypes.func.isRequired,
        maxFileSize: PropTypes.number.isRequired,
        navigation: PropTypes.object.isRequired,
        teamId: PropTypes.string.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props, context) {
        super(props, context);

        props.navigation.setOptions({
            title: context.intl.formatMessage({
                id: 'mobile.extension.title',
                defaultMessage: 'Share in Mattermost',
            }),
        });

        this.state = {
            channelId: props.channelId,
            files: [],
            hasPermission: null,
            teamId: props.teamId,
            totalSize: 0,
            value: '',
        };
    }

    componentDidMount() {
        this.props.navigation.setOptions({
            headerLeft: this.leftHeader,
        });
        this.auth();
    }

    auth = async () => {
        try {
            const {formatMessage} = this.context.intl;
            const config = await mattermostManaged.getConfig();

            if (config) {
                const authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';
                const vendor = config.vendor || 'Mattermost';

                if (authNeeded) {
                    const isSecured = await mattermostManaged.isDeviceSecure();
                    if (isSecured) {
                        try {
                            await LocalAuth.auth({
                                reason: formatMessage({
                                    id: 'mobile.managed.secured_by',
                                    defaultMessage: 'Secured by {vendor}',
                                }, {vendor}),
                                fallbackToPasscode: true,
                                suppressEnterPassword: false,
                            });
                        } catch (err) {
                            return this.onClose({nativeEvent: true});
                        }
                    } else {
                        await this.showNotSecuredAlert(vendor);

                        return this.onClose({nativeEvent: true});
                    }
                }
            }
        } catch (e) {
            // do nothing
        }

        return this.initialize();
    };

    canPost = (error, text, extensionFiles, calculatedSize) => {
        const {maxFileSize} = this.props;
        const files = extensionFiles || this.state.files;
        const totalSize = calculatedSize || this.state.totalSize;
        const filesOK = files.length ? files.length <= MAX_FILE_COUNT : false;
        const sizeOK = totalSize ? totalSize <= maxFileSize : false;

        if (!error && ((filesOK && sizeOK) || text.length)) {
            this.props.navigation.setOptions({headerRight: this.rightHeader});
        } else {
            this.props.navigation.setOptions({headerRight: null});
        }
    }

    showNotSecuredAlert(vendor) {
        const {formatMessage} = this.context.intl;

        return new Promise((resolve) => {
            Alert.alert(
                formatMessage({
                    id: 'mobile.managed.blocked_by',
                    defaultMessage: 'Blocked by {vendor}',
                }, {vendor}),
                formatMessage({
                    id: 'mobile.managed.not_secured.android',
                    defaultMessage: 'This device must be secured with a screen lock to use Mattermost.',
                }),
                [
                    {
                        text: formatMessage({
                            id: 'mobile.managed.settings',
                            defaultMessage: 'Go to settings',
                        }),
                        onPress: () => {
                            mattermostManaged.goToSecuritySettings();
                        },
                    },
                    {
                        text: formatMessage({
                            id: 'mobile.managed.exit',
                            defaultMessage: 'Exit',
                        }),
                        onPress: resolve,
                        style: 'cancel',
                    },
                ],
                {onDismiss: resolve},
            );
        });
    }

    getAppCredentials = async () => {
        try {
            const url = await getCurrentServerUrl();
            const credentials = await getAppCredentials();

            if (credentials) {
                const token = credentials.password;

                if (url && url !== 'undefined' && token && token !== 'undefined') {
                    this.token = token;
                    this.url = url;
                    Client4.setUrl(url);
                    Client4.setToken(token);
                    await setCSRFFromCookie(url);
                }
            }
        } catch (error) {
            return null;
        }

        return null;
    };

    getInputRef = (ref) => {
        this.input = ref;
    };

    goToChannels = preventDoubleTap(() => {
        const {formatMessage} = this.context.intl;
        const {navigation} = this.props;
        const navigateAction = NavigationActions.navigate({
            name: 'Channels',
            params: {
                title: formatMessage({
                    id: 'mobile.routes.selectChannel',
                    defaultMessage: 'Select Channel',
                }),
                currentChannelId: this.state.channelId,
                onSelectChannel: this.handleSelectChannel,
            },
        });
        navigation.dispatch(navigateAction);
    });

    goToTeams = preventDoubleTap(() => {
        const {formatMessage} = this.context.intl;
        const {navigation} = this.props;
        const navigateAction = NavigationActions.navigate({
            name: 'Teams',
            params: {
                title: formatMessage({
                    id: 'mobile.routes.selectTeam',
                    defaultMessage: 'Select Team',
                }),
                currentTeamId: this.state.teamId,
                onSelectTeam: this.handleSelectTeam,
            },
        });
        navigation.dispatch(navigateAction);
    });

    handleBlur = () => {
        if (this.input) {
            this.input.setNativeProps({
                autoScroll: false,
            });
        }
    };

    handleFocus = () => {
        if (this.input) {
            this.input.setNativeProps({
                autoScroll: true,
            });
        }
    };

    handleSelectChannel = (channelId) => {
        this.setState({channelId});
    };

    handleSelectTeam = (teamId, defaultChannelId) => {
        this.setState({teamId, channelId: defaultChannelId});
    };

    handleTextChange = (value) => {
        this.canPost(null, value);
        this.setState({value});
    };

    initialize = async () => {
        await this.getAppCredentials();

        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        let granted;
        if (!hasPermission) {
            granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            );
        }

        if (hasPermission || granted === PermissionsAndroid.RESULTS.GRANTED) {
            const data = await ShareExtension.data();
            return this.loadData(data);
        }

        return this.setState({hasPermission: false});
    };

    leftHeader = () => (
        <TouchableOpacity
            accessibilityComponentType='button'
            accessibilityTraits='button'
            borderless={true}
            delayPressIn={0}
            pressColorAndroid='rgba(0, 0, 0, .32)'
            onPress={this.onClose}
        >
            <View style={styles.left}>
                <CompassIcon
                    name='close'
                    style={styles.closeButton}
                />
            </View>
        </TouchableOpacity>
    );

    loadData = async (items) => {
        const {getTeamChannels, teamId} = this.props;
        if (this.token && this.url) {
            const text = [];
            const files = [];
            let totalSize = 0;
            let error;

            getTeamChannels(teamId);

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                switch (item.type) {
                case 'text/plain':
                    text.push(item.value);
                    break;
                default: {
                    let fileSize = {size: 0};
                    const fullPath = item.value;
                    try {
                        fileSize = await RNFetchBlob.fs.stat(fullPath); // eslint-disable-line no-await-in-loop
                    } catch (e) {
                        const {formatMessage} = this.context.intl;
                        error = formatMessage({
                            id: 'mobile.extension.file_error',
                            defaultMessage: 'There was an error reading the file to be shared.\nPlease try again.',
                        });
                        break;
                    }
                    let filename = fullPath.replace(/^.*[\\/]/, '');
                    let extension = filename.split('.').pop();
                    if (extension === filename) {
                        extension = getExtensionFromMime(item.type);
                        filename = `${filename}.${extension}`;
                    }

                    totalSize += fileSize.size;
                    files.push({
                        extension,
                        filename,
                        fullPath,
                        mimeType: item.type || lookupMimeType(filename.toLowerCase()),
                        size: getFormattedFileSize(fileSize),
                        type: item.type,
                    });
                    break;
                }
                }
            }

            const value = text.join('\n');
            this.canPost(error, value, files, totalSize);

            this.setState({error, files, value, hasPermission: true, totalSize});
        }
        this.setState({loaded: true});
    };

    onClose = (data) => {
        ShareExtension.close(data.nativeEvent ? null : data);
    };

    onPost = () => {
        const {channelId, files, value} = this.state;
        const {currentUserId} = this.props;
        const {formatMessage} = this.context.intl;

        if (value.length > MAX_MESSAGE_LENGTH_FALLBACK) {
            Alert.alert(
                formatMessage({
                    id: 'mobile.share_extension.too_long_title',
                    defaultMessage: 'Message is too long',
                }),
                formatMessage({
                    id: 'mobile.share_extension.too_long_message',
                    defaultMessage: 'Character count: {count}/{max}',
                }, {
                    count: value.length,
                    max: MAX_MESSAGE_LENGTH_FALLBACK,
                }),
            );
        } else {
            const data = {
                channelId,
                currentUserId,
                files,
                token: this.token,
                url: this.url,
                value,
            };

            this.onClose(data);
        }
    };

    renderBody = () => {
        const {formatMessage} = this.context.intl;
        const {channelId, value} = this.state;

        const channel = this.props.channels[channelId];
        const channelDisplayName = channel?.display_name || ''; //eslint-disable-line camelcase

        return (
            <ScrollView
                ref={this.getScrollViewRef}
                contentContainerStyle={styles.scrollView}
                style={styles.flex}
            >
                <TextInput
                    ref={this.getInputRef}
                    autoCapitalize='sentences'
                    multiline={true}
                    onBlur={this.handleBlur}
                    onChangeText={this.handleTextChange}
                    onFocus={this.handleFocus}
                    placeholder={formatMessage({id: 'create_post.write', defaultMessage: 'Write to {channelDisplayName}'}, {channelDisplayName})}
                    placeholderTextColor={changeOpacity(defaultTheme.centerChannelColor, 0.5)}
                    style={styles.input}
                    underlineColorAndroid='transparent'
                    value={value}
                />
                {this.renderFiles()}
            </ScrollView>
        );
    };

    renderChannelButton = () => {
        const {channelId} = this.state;

        return (
            <ChannelButton
                channelId={channelId}
                onPress={this.goToChannels}
                theme={defaultTheme}
            />
        );
    };

    renderErrorMessage = (message) => {
        return (
            <View
                style={styles.flex}
            >
                <View style={styles.unauthenticatedContainer}>
                    <Text style={styles.unauthenticated}>
                        {message}
                    </Text>
                </View>
            </View>
        );
    };

    renderFiles = () => {
        const {files} = this.state;

        return files.map((file, index) => {
            let component;

            if (file.type.startsWith('image')) {
                component = (
                    <View
                        key={`item-${index}`}
                        style={styles.imageContainer}
                    >
                        <FastImage
                            source={{uri: file.fullPath, isStatic: true}}
                            resizeMode='cover'
                            style={styles.image}
                        />
                    </View>
                );
            } else if (file.type.startsWith('video')) {
                component = (
                    <View
                        key={`item-${index}`}
                        style={styles.imageContainer}
                    >
                        <Video
                            ref={`video-${index}`}
                            style={styles.video}
                            resizeMode='cover'
                            source={{uri: file.fullPath}}
                            volume={0}
                            paused={true}
                            onLoad={() => this.refs[`video-${index}`].seek(0)}
                        />
                    </View>
                );
            } else {
                let SvgIcon = extensionSvg[file.extension];
                if (!SvgIcon) {
                    SvgIcon = GenericSvg;
                }

                component = (
                    <View
                        key={`item-${index}`}
                        style={styles.otherContainer}
                    >
                        <View style={styles.otherWrapper}>
                            <View style={styles.fileIcon}>
                                <SvgIcon
                                    width={19}
                                    height={48}
                                />
                            </View>
                        </View>
                    </View>
                );
            }

            return (
                <View
                    style={styles.fileContainer}
                    key={`item-${index}`}
                >
                    {component}
                    <Text
                        ellipsisMode='tail'
                        numberOfLines={1}
                        style={styles.filename}
                    >
                        {`${file.size} - ${file.filename}`}
                    </Text>
                </View>
            );
        });
    };

    rightHeader = () => (
        <TouchableOpacity
            accessibilityComponentType='button'
            accessibilityTraits='button'
            borderless={true}
            delayPressIn={0}
            pressColorAndroid='rgba(0, 0, 0, .32)'
            onPress={this.onPost}
        >
            <View style={styles.left}>
                <CompassIcon
                    name='send'
                    size={20}
                    color={defaultTheme.sidebarHeaderTextColor}
                />
            </View>
        </TouchableOpacity>
    );

    renderTeamButton = () => {
        const {teamId} = this.state;

        return (
            <TeamButton
                onPress={this.goToTeams}
                teamId={teamId}
                theme={defaultTheme}
            />
        );
    };

    lengthCounterColor = (count) => {
        if (count < 0) {
            return styles.textTooLong;
        }
        return styles.textLengthOk;
    }

    renderMessageLengthRemaining = () => {
        const {value} = this.state;
        const messageLengthRemaining = MAX_MESSAGE_LENGTH_FALLBACK - value.length;

        if (value.length === 0) {
            return null;
        }

        const renderStyle = [styles.messageLengthRemaining, this.lengthCounterColor(messageLengthRemaining)];
        return (
            <Text style={renderStyle}>
                {messageLengthRemaining}
            </Text>
        );
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {maxFileSize} = this.props;
        const {error, hasPermission, files, totalSize, loaded, teamId} = this.state;

        if (!loaded) {
            return (
                <Loading/>
            );
        }

        if (error) {
            return this.renderErrorMessage(error);
        }

        if (!teamId && this.token) {
            const teamRequired = formatMessage({
                id: 'mobile.extension.team_required',
                defaultMessage: 'You must belong to a team before you can share files.',
            });

            return this.renderErrorMessage(teamRequired);
        }

        if (this.token && this.url) {
            if (hasPermission === false) {
                const storage = formatMessage({
                    id: 'mobile.extension.permission',
                    defaultMessage: 'Mattermost needs access to the device storage to share files.',
                });

                return this.renderErrorMessage(storage);
            } else if (files.length > MAX_FILE_COUNT) {
                const fileCount = formatMessage({
                    id: 'mobile.extension.file_limit',
                    defaultMessage: 'Sharing is limited to a maximum of 5 files.',
                });

                return this.renderErrorMessage(fileCount);
            } else if (totalSize > maxFileSize) {
                const maxSize = formatMessage({
                    id: 'mobile.extension.max_file_size',
                    defaultMessage: 'File attachments shared in Mattermost must be less than {size}.',
                }, {size: getFormattedFileSize({size: maxFileSize})});

                return this.renderErrorMessage(maxSize);
            }

            return (
                <View style={styles.container}>
                    <View style={styles.wrapper}>
                        {this.renderBody()}
                        <View style={styles.flex}>
                            {this.renderMessageLengthRemaining()}
                            {this.renderTeamButton()}
                            {this.renderChannelButton()}
                        </View>
                    </View>
                </View>
            );
        }

        const loginNeeded = formatMessage({
            id: 'mobile.extension.authentication_required',
            defaultMessage: 'Authentication required: Please first login using the app.',
        });

        return this.renderErrorMessage(loginNeeded);
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        left: {
            alignItems: 'center',
            height: 50,
            justifyContent: 'center',
            width: 50,
        },
        closeButton: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 20,
        },
        flex: {
            flex: 1,
        },
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.05),
            flex: 1,
        },
        scrollView: {
            flex: 1,
            padding: 15,
        },
        messageLengthRemaining: {
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 15,
            paddingRight: 15,
            opacity: 0.5,
        },
        textLengthOk: {
            color: theme.centerChannelColor,
        },
        textTooLong: {
            color: theme.errorTextColor,
        },
        input: {
            flex: 1,
            color: theme.centerChannelColor,
            fontSize: 17,
            height: INPUT_HEIGHT,
            marginBottom: 5,
            textAlignVertical: 'top',
            width: '100%',
        },
        unauthenticatedContainer: {
            alignItems: 'center',
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 35,
        },
        unauthenticated: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
        fileContainer: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 4,
            borderWidth: 1,
            flexDirection: 'row',
            height: 48,
            marginBottom: 10,
            width: '100%',
        },
        filename: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13,
            flex: 1,
        },
        otherContainer: {
            borderBottomLeftRadius: 4,
            borderTopLeftRadius: 4,
            height: 48,
            marginRight: 10,
            paddingVertical: 10,
            width: 38,
        },
        otherWrapper: {
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
            flex: 1,
        },
        fileIcon: {
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
        },
        imageContainer: {
            justifyContent: 'center',
            borderBottomLeftRadius: 4,
            borderTopLeftRadius: 4,
            height: 48,
            marginRight: 10,
            width: 38,
            overflow: 'hidden',
        },
        image: {
            alignItems: 'center',
            borderBottomLeftRadius: 4,
            borderTopLeftRadius: 4,
            height: 46,
            justifyContent: 'center',
            overflow: 'hidden',
            width: 38,
        },
        video: {
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            overflow: 'hidden',
            width: 38,
        },
    };
});

const styles = getStyleSheet(defaultTheme);
