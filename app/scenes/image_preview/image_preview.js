// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Animated,
    Dimensions,
    InteractionManager,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import FileAttachmentIcon from 'app/components/file_attachment_list/file_attachment_icon';
import FileAttachmentPreview from 'app/components/file_attachment_list/file_attachment_preview';

const {View: AnimatedView} = Animated;
const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');
const DRAG_VERTICAL_THRESHOLD_START = 25; // When do we want to start capturing the drag
const DRAG_VERTICAL_THRESHOLD_END = 100; // When do we want to navigate back
const DRAG_HORIZONTAL_THRESHOLD = 50; // Make sure that it's not a sloppy horizontal swipe
const HEADER_HEIGHT = 64;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? 25 : 0; // Used to account for the Android status bar

export default class ImagePreview extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addFileToFetchCache: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired
        }),
        fetchCache: PropTypes.object.isRequired,
        fileId: PropTypes.string.isRequired,
        files: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired
    };

    static navigationProps = {
        allowSceneSwipe: false,
        hideNavBar: true,
        modalAnimationType: 'fade'
    };

    constructor(props) {
        super(props);

        const currentFile = props.files.findIndex((file) => file.id === props.fileId);
        this.state = {
            currentFile,
            deviceHeight,
            deviceWidth,
            drag: new Animated.ValueXY(),
            footerOpacity: new Animated.Value(1),
            pagingEnabled: true,
            showFileInfo: true,
            wrapperViewOpacity: new Animated.Value(Platform.OS === 'android' ? 0 : 1)
        };
    }

    componentWillMount() {
        this.panResponder = PanResponder.create({
            onMoveShouldSetPanResponderCapture: this.onMoveShouldSetPanResponderCapture,
            onPanResponderMove: Animated.event([null, {
                dx: 0,
                dy: this.state.drag.y
            }]),
            onPanResponderRelease: this.onPanResponderRelease,
            onPanResponderTerminate: this.onPanResponderRelease
        });
    }

    componentDidMount() {
        // TODO: Use contentOffset on Android once PR is merged
        // This is a hack until this PR gets merged: https://github.com/facebook/react-native/pull/12502
        // On Android there is a render animation for scrollViews. In order for scrollTo to work
        // on scrollViews we have to wait for the animation to finish. This will cause a bad flicker when we
        // want to set the offset of the scrollView to show say the second file of a post with 3 files.
        // Using this delayed opacity animation allows us to wait for the scrollView animation to finish,
        // scollTo the correct offset for the chosen file, and then fade in like the component does on iOS.
        if (Platform.OS === 'android') {
            InteractionManager.runAfterInteractions(() => {
                this.scrollView.scrollTo({x: (this.state.currentFile) * this.state.deviceWidth, animated: false});
                Animated.timing(this.state.wrapperViewOpacity, {
                    toValue: 1,
                    duration: 200,
                    delay: 75
                }).start();
            });
        }
    }

    onMoveShouldSetPanResponderCapture = (evt, gestureState) => {
        const {dx, dy} = gestureState;
        return (Math.abs(dy) > DRAG_VERTICAL_THRESHOLD_START && dx < DRAG_HORIZONTAL_THRESHOLD);
    }

    onPanResponderRelease = (evt, gestureState) => {
        if (Math.abs(gestureState.dy) > DRAG_VERTICAL_THRESHOLD_END) {
            this.props.actions.goBack();
        } else {
            Animated.spring(this.state.drag, {
                toValue: {x: 0, y: 0}
            }).start();
        }
    }

    toggleFileInfo = () => {
        const showFileInfo = !this.state.showFileInfo;
        this.setState({
            showFileInfo
        });

        const opacity = showFileInfo ? 1 : 0;

        Animated.timing(this.state.footerOpacity, {
            toValue: opacity,
            duration: 300
        }).start();
    }

    handleScroll = (event) => {
        if (event.nativeEvent.contentOffset.x % this.state.deviceWidth === 0) {
            this.setState({
                currentFile: (event.nativeEvent.contentOffset.x / this.state.deviceWidth),
                pagingEnabled: true
            });
        }
    }

    attachScrollView = (c) => {
        this.scrollView = c;
    }

    onLayout = (event) => {
        if (event.nativeEvent.layout.width !== this.state.deviceWidth) {
            this.setState({
                deviceHeight: event.nativeEvent.layout.height,
                deviceWidth: event.nativeEvent.layout.width
            });
        }
    }

    render() {
        const maxImageHeight = this.state.deviceHeight - HEADER_HEIGHT - STATUS_BAR_HEIGHT;

        return (
            <View
                style={style.wrapper}
                onLayout={this.onLayout}
            >
                <AnimatedView
                    style={[this.state.drag.getLayout(), {opacity: this.state.wrapperViewOpacity}]}
                    {...this.panResponder.panHandlers}
                >
                    <View style={style.header}>
                        <View style={style.headerControls}>
                            <TouchableOpacity
                                onPress={this.props.actions.goBack}
                                style={style.headerIcon}
                            >
                                <Icon
                                    name='md-close'
                                    size={26}
                                    color='#fff'
                                />
                            </TouchableOpacity>
                            <Text style={style.title}>
                                {`${this.state.currentFile + 1}/${this.props.files.length}`}
                            </Text>
                            <TouchableOpacity
                                onPress={() => true}
                                style={style.headerIcon}
                            >
                                {/*<Icon
                                    name='download'
                                    size={15}
                                    color='#fff'
                                />*/}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView
                        ref={this.attachScrollView}
                        style={[style.ScrollView]}
                        contentContainerStyle={style.scrollViewContent}
                        horizontal={true}
                        pagingEnabled={this.state.pagingEnabled}
                        bounces={false}
                        onScroll={this.handleScroll}
                        scrollEventThrottle={1}
                        contentOffset={{x: (this.state.currentFile) * this.state.deviceWidth}}
                    >
                        {this.props.files.map((file) => {
                            let component;
                            if (file.has_preview_image) {
                                component = (
                                    <FileAttachmentPreview
                                        addFileToFetchCache={this.props.actions.addFileToFetchCache}
                                        fetchCache={this.props.fetchCache}
                                        file={file}
                                        theme={this.props.theme}
                                        imageHeight={Math.min(maxImageHeight, file.height)}
                                        imageWidth={Math.min(this.state.deviceWidth, file.width)}
                                        resizeMode='contain'
                                        wrapperBackgroundColor='#000'
                                        wrapperHeight={maxImageHeight}
                                        wrapperWidth={this.state.deviceWidth}
                                    />
                                );
                            } else {
                                component = (
                                    <FileAttachmentIcon
                                        file={file}
                                        theme={this.props.theme}
                                        iconHeight={120}
                                        iconWidth={120}
                                        wrapperHeight={200}
                                        wrapperWidth={200}
                                    />
                                );
                            }

                            return (
                                <TouchableWithoutFeedback
                                    key={file.id}
                                    onPress={this.toggleFileInfo}
                                >
                                    <View style={[style.pageWrapper, {height: maxImageHeight, width: this.state.deviceWidth}]}>
                                        {component}
                                    </View>
                                </TouchableWithoutFeedback>
                            );
                        })}
                    </ScrollView>
                    <AnimatedView
                        style={[style.footerWrapper, {width: this.state.deviceWidth, opacity: this.state.footerOpacity}]}
                        pointerEvents='none'
                    >
                        <LinearGradient
                            style={style.footer}
                            start={{x: 0.0, y: 0.0}}
                            end={{x: 0.0, y: 0.9}}
                            colors={['transparent', '#000000']}
                        >
                            <Text style={style.filename}>
                                {this.props.files[this.state.currentFile].name}
                            </Text>
                        </LinearGradient>
                    </AnimatedView>
                </AnimatedView>
            </View>
        );
    }
}

const style = StyleSheet.create({
    filename: {
        color: 'white',
        fontSize: 15
    },
    footer: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 16
    },
    footerWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 100
    },
    header: {
        backgroundColor: '#000',
        height: HEADER_HEIGHT
    },
    headerControls: {
        alignItems: 'center',
        justifyContent: 'space-around',
        flexDirection: 'row',
        ...Platform.select({
            ios: {
                marginTop: 20
            },
            android: {
                marginTop: 10
            }
        })
    },
    headerIcon: {
        height: 44,
        width: 48,
        alignItems: 'center',
        justifyContent: 'center'
    },
    pageWrapper: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    scrollView: {
        flex: 1
    },
    scrollViewContent: {
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        flex: 1,
        marginHorizontal: 10,
        color: 'white',
        fontSize: 15,
        textAlign: 'center'
    },
    wrapper: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }
});
