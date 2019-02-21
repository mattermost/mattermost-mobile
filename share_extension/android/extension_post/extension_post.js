// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {NavigationActions} from 'react-navigation';
import TouchableItem from 'react-navigation-stack/dist/views/TouchableItem';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

import {
    Image,
    NativeModules,
    PermissionsAndroid,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import LocalAuth from 'react-native-local-auth';
import RNFetchBlob from 'rn-fetch-blob';

import {Preferences} from 'mattermost-redux/constants';
import {getFormattedFileSize, lookupMimeType} from 'mattermost-redux/utils/file_utils';

import Loading from 'app/components/loading';
import PaperPlane from 'app/components/paper_plane';
import {MAX_FILE_COUNT} from 'app/constants/post_textbox';
import mattermostManaged from 'app/mattermost_managed';
import {getExtensionFromMime} from 'app/utils/file';
import {emptyFunction} from 'app/utils/general';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {
    ExcelSvg,
    GenericSvg,
    PdfSvg,
    PptSvg,
    ZipSvg,
} from 'share_extension/common/icons';

import ChannelButton from './channel_button';
import TeamButton from './team_button';

const defalultTheme = Preferences.THEMES.default;
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
const MAX_MESSAGE_LENGTH = 4000;

export default class ExtensionPost extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getTeamChannels: PropTypes.func.isRequired,
        }).isRequired,
        channelId: PropTypes.string,
        currentUserId: PropTypes.string.isRequired,
        maxFileSize: PropTypes.number.isRequired,
        navigation: PropTypes.object.isRequired,
        teamId: PropTypes.string.isRequired,
        token: PropTypes.string,
        url: PropTypes.string,
    };

    static contextTypes = {
        intl: intlShape,
    };

    static navigationOptions = ({navigation}) => {
        const {params = {}} = navigation.state;
        const title = params.title || '';
        const headerLeft = (
            <TouchableItem
                accessibilityComponentType='button'
                accessibilityTraits='button'
                borderless={true}
                delayPressIn={0}
                pressColorAndroid='rgba(0, 0, 0, .32)'
                onPress={params.close ? params.close : emptyFunction}
            >
                <View style={styles.left}>
                    <MaterialIcon
                        name='close'
                        style={styles.closeButton}
                    />
                </View>
            </TouchableItem>
        );

        let headerRight = null;

        if (params.post) {
            headerRight = (
                <TouchableItem
                    accessibilityComponentType='button'
                    accessibilityTraits='button'
                    borderless={true}
                    delayPressIn={0}
                    pressColorAndroid='rgba(0, 0, 0, .32)'
                    onPress={params.post}
                >
                    <View style={styles.left}>
                        <PaperPlane
                            color={defalultTheme.sidebarHeaderTextColor}
                            height={20}
                            width={20}
                        />
                    </View>
                </TouchableItem>
            );
        }

        return {headerLeft, headerRight, title};
    };

    constructor(props, context) {
        super(props, context);

        props.navigation.setParams({
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
        this.props.navigation.setParams({
            close: this.onClose,
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
                    }
                }
            }
        } catch (e) {
            // do nothing
        }

        return this.initialize();
    };

    getInputRef = (ref) => {
        this.input = ref;
    };

    goToChannels = preventDoubleTap(() => {
        const {formatMessage} = this.context.intl;
        const {navigation} = this.props;
        const navigateAction = NavigationActions.navigate({
            routeName: 'Channels',
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
            routeName: 'Teams',
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
        this.setState({value});
    };

    initialize = async () => {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        let granted;
        if (!hasPermission) {
            granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
            );
        }

        if (hasPermission || granted === PermissionsAndroid.RESULTS.GRANTED) {
            const data = await ShareExtension.data();
            return this.loadData(data);
        }

        return this.setState({hasPermission: false});
    };

    loadData = async (items) => {
        const {actions, maxFileSize, teamId, token, url} = this.props;
        if (token && url) {
            const text = [];
            const files = [];
            let totalSize = 0;
            let error;

            actions.getTeamChannels(teamId);

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

            if (!error && files.length <= MAX_FILE_COUNT && totalSize <= maxFileSize) {
                this.props.navigation.setParams({
                    post: this.onPost,
                });
            }

            this.setState({error, files, value, hasPermission: true, totalSize});
        }
        this.setState({loaded: true});
    };

    onClose = (data) => {
        ShareExtension.close(data.nativeEvent ? null : data);
    };

    onPost = () => {
        const {channelId, files, value} = this.state;
        const {currentUserId, token, url} = this.props;

        const data = {
            channelId,
            currentUserId,
            files,
            token,
            url,
            value,
        };

        this.onClose(data);
    };

    renderBody = () => {
        const {formatMessage} = this.context.intl;
        const {value} = this.state;

        return (
            <ScrollView
                ref={this.getScrollViewRef}
                contentContainerStyle={styles.scrollView}
                style={styles.flex}
            >
                <TextInput
                    ref={this.getInputRef}
                    autoCapitalize='sentences'
                    maxLength={MAX_MESSAGE_LENGTH}
                    multiline={true}
                    onBlur={this.handleBlur}
                    onChangeText={this.handleTextChange}
                    onFocus={this.handleFocus}
                    placeholder={formatMessage({id: 'create_post.write', defaultMessage: 'Write a message...'})}
                    placeholderTextColor={changeOpacity(defalultTheme.centerChannelColor, 0.5)}
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
                theme={defalultTheme}
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
                        <Image
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

    renderTeamButton = () => {
        const {teamId} = this.state;

        return (
            <TeamButton
                onPress={this.goToTeams}
                teamId={teamId}
                theme={defalultTheme}
            />
        );
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {maxFileSize, token, url} = this.props;
        const {error, hasPermission, files, totalSize, loaded} = this.state;

        if (!loaded) {
            return (
                <Loading/>
            );
        }

        if (error) {
            return this.renderErrorMessage(error);
        }

        if (token && url) {
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
            padding: 15,
        },
        input: {
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

const styles = getStyleSheet(defalultTheme);
