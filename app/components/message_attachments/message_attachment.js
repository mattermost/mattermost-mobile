// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    Image,
    Linking,
    Platform,
    Text,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import Markdown from 'app/components/markdown';
import ProgressiveImage from 'app/components/progressive_image';
import ShowMoreButton from 'app/components/show_more_button';

import CustomPropTypes from 'app/constants/custom_prop_types';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex, calculateDimensions} from 'app/utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ActionButton from './action_button';
import ActionMenu from './action_menu';

const VIEWPORT_IMAGE_CONTAINER_OFFSET = 10;
const VIEWPORT_IMAGE_OFFSET = 32;
const STATUS_COLORS = {
    good: '#00c100',
    warning: '#dede01',
    danger: '#e40303',
};

export default class MessageAttachment extends PureComponent {
    static propTypes = {
        attachment: PropTypes.object.isRequired,
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        postId: PropTypes.string.isRequired,
        onLongPress: PropTypes.func.isRequired,
        onPermalinkPress: PropTypes.func,
        theme: PropTypes.object,
        textStyles: PropTypes.object,
    };

    constructor(props) {
        super(props);

        this.state = {
            collapsed: true,
            imageUri: null,
            isLongText: false,
        };
    }

    componentWillMount() {
        if (this.props.attachment.image_url) {
            ImageCacheManager.cache(null, this.props.attachment.image_url, this.setImageUrl);
        }
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getActionView = (style) => {
        const {attachment, postId, navigator} = this.props;
        const {actions} = attachment;

        if (!actions || !actions.length) {
            return null;
        }

        const content = [];

        actions.forEach((action) => {
            if (!action.id || !action.name) {
                return;
            }

            switch (action.type) {
            case 'select':
                content.push(
                    <ActionMenu
                        key={action.id}
                        id={action.id}
                        name={action.name}
                        dataSource={action.data_source}
                        options={action.options}
                        postId={postId}
                        navigator={navigator}
                    />
                );
                break;
            case 'button':
            default:
                content.push(
                    <ActionButton
                        key={action.id}
                        id={action.id}
                        name={action.name}
                        postId={postId}
                    />
                );
                break;
            }
        });

        return (
            <View style={style.actionsContainer}>
                {content}
            </View>
        );
    };

    measurePost = (event) => {
        const {height} = event.nativeEvent.layout;
        const {height: deviceHeight} = Dimensions.get('window');

        if (height >= (deviceHeight * 0.6)) {
            this.setState({
                isLongText: true,
                maxHeight: (deviceHeight * 0.4),
            });
        }
    };

    getFieldsTable = (style) => {
        const {
            attachment,
            baseTextStyle,
            blockStyles,
            navigator,
            onPermalinkPress,
            textStyles,
        } = this.props;
        const fields = attachment.fields;
        if (!fields || !fields.length) {
            return null;
        }

        const fieldTables = [];

        let fieldInfos = [];
        let rowPos = 0;
        let lastWasLong = false;
        let nrTables = 0;

        fields.forEach((field, i) => {
            if (rowPos === 2 || !(field.short === true) || lastWasLong) {
                fieldTables.push(
                    <View
                        key={`attachment__table__${nrTables}`}
                        style={{alignSelf: 'stretch', flexDirection: 'row'}}
                    >
                        {fieldInfos}
                    </View>
                );
                fieldInfos = [];
                rowPos = 0;
                nrTables += 1;
                lastWasLong = false;
            }

            fieldInfos.push(
                <View
                    style={{flex: 1}}
                    key={`attachment__field-${i}__${nrTables}`}
                >
                    <View
                        style={style.headingContainer}
                        key={`attachment__field-caption-${i}__${nrTables}`}
                    >
                        <View>
                            <Text style={style.heading}>
                                {field.title}
                            </Text>
                        </View>
                    </View>
                    <View
                        style={style.bodyContainer}
                        key={`attachment__field-${i}__${nrTables}`}
                    >
                        <Markdown
                            baseTextStyle={baseTextStyle}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            value={(field.value || '')}
                            navigator={navigator}
                            onLongPress={this.props.onLongPress}
                            onPermalinkPress={onPermalinkPress}
                        />
                    </View>
                </View>
            );

            rowPos += 1;
            lastWasLong = !(field.short === true);
        });

        if (fieldInfos.length > 0) { // Flush last fields
            fieldTables.push(
                <View
                    key={`attachment__table__${nrTables}`}
                    style={{flex: 1, flexDirection: 'row'}}
                >
                    {fieldInfos}
                </View>
            );
        }

        return (
            <View>
                {fieldTables}
            </View>
        );
    };

    handleLayout = (event) => {
        if (!this.maxImageWidth) {
            const {height, width} = event.nativeEvent.layout;
            const viewPortWidth = width > height ? height : width;
            this.maxImageWidth = viewPortWidth - VIEWPORT_IMAGE_OFFSET;
        }
    };

    handlePreviewImage = () => {
        const {attachment, navigator} = this.props;
        const {
            imageUri: uri,
            originalHeight,
            originalWidth,
        } = this.state;
        const link = attachment.image_url;
        let filename = link.substring(link.lastIndexOf('/') + 1, link.indexOf('?') === -1 ? link.length : link.indexOf('?'));
        const extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
        }

        const files = [{
            caption: filename,
            dimensions: {
                height: originalHeight,
                width: originalWidth,
            },
            source: {uri},
            data: {
                localPath: uri,
            },
        }];
        previewImageAtIndex(navigator, [this.refs.item], 0, files);
    };

    openLink = (link) => {
        if (Linking.canOpenURL(link)) {
            Linking.openURL(link);
        }
    };

    setImageUrl = (imageURL) => {
        let imageUri = imageURL;

        if (Platform.OS === 'android') {
            imageUri = `file://${imageURL}`;
        }

        Image.getSize(imageUri, (width, height) => {
            const dimensions = calculateDimensions(height, width, this.maxImageWidth);
            if (this.mounted) {
                this.setState({
                    ...dimensions,
                    originalWidth: width,
                    originalHeight: height,
                    imageUri,
                });
            }
        }, () => null);
    };

    toggleCollapseState = () => {
        this.setState((prevState) => ({collapsed: !prevState.collapsed}));
    };

    render() { // eslint-disable-line complexity
        const {
            attachment,
            baseTextStyle,
            blockStyles,
            textStyles,
            navigator,
            onPermalinkPress,
            theme,
        } = this.props;

        const {
            height,
            imageUri,
            width,
            collapsed,
            isLongText,
            maxHeight,
        } = this.state;

        const style = getStyleSheet(theme);

        let preText;
        if (attachment.pretext) {
            preText = (
                <View style={{marginTop: 5}}>
                    <Markdown
                        baseTextStyle={baseTextStyle}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        value={attachment.pretext}
                        navigator={navigator}
                        onLongPress={this.props.onLongPress}
                        onPermalinkPress={onPermalinkPress}
                    />
                </View>
            );
        }

        let borderStyle;
        if (attachment.color) {
            if (attachment.color[0] === '#') {
                borderStyle = {borderLeftColor: attachment.color};
            } else if (STATUS_COLORS.hasOwnProperty(attachment.color)) {
                borderStyle = {borderLeftColor: STATUS_COLORS[attachment.color]};
            }
        }

        const author = [];
        if (attachment.author_name || attachment.author_icon) {
            if (attachment.author_icon) {
                author.push(
                    <Image
                        source={{uri: attachment.author_icon}}
                        key='author_icon'
                        style={style.authorIcon}
                    />
                );
            }
            if (attachment.author_name) {
                let link;
                let linkStyle;
                if (attachment.author_link) {
                    link = () => this.openLink(attachment.author_link);
                    linkStyle = style.authorLink;
                }
                author.push(
                    <Text
                        key='author_name'
                        style={[style.author, linkStyle]}
                        onPress={link}
                    >
                        {attachment.author_name}
                    </Text>
                );
            }
        }

        let title;
        let titleStyle;
        if (attachment.title) {
            let titleLink;
            if (attachment.title_link) {
                titleStyle = style.titleLink;
                titleLink = () => this.openLink(attachment.title_link);
            }

            title = (
                <Text
                    style={[style.title, titleStyle]}
                    onPress={titleLink}
                >
                    {attachment.title}
                </Text>
            );
        }

        let thumb;
        let topStyle;
        if (attachment.thumb_url) {
            topStyle = style.topContent;
            thumb = (
                <View style={style.thumbContainer}>
                    <Image
                        source={{uri: attachment.thumb_url}}
                        resizeMode='contain'
                        resizeMethod='scale'
                        style={style.thumb}
                    />
                </View>
            );
        }

        let text;
        if (attachment.text) {
            text = (
                <View
                    onLayout={this.measurePost}
                    style={topStyle}
                >
                    <View
                        style={[(isLongText && collapsed && {maxHeight, overflow: 'hidden'})]}
                        removeClippedSubviews={isLongText && collapsed && Platform.OS !== 'android'}
                    >
                        <Markdown
                            baseTextStyle={baseTextStyle}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            value={attachment.text}
                            navigator={navigator}
                            onLongPress={this.props.onLongPress}
                            onPermalinkPress={onPermalinkPress}
                        />
                    </View>
                    {isLongText &&
                    <ShowMoreButton
                        onPress={this.toggleCollapseState}
                        showMore={collapsed}
                    />
                    }
                </View>
            );
        }

        const fields = this.getFieldsTable(style);
        const actions = this.getActionView(style);

        let image;
        if (imageUri) {
            image = (
                <View
                    ref='item'
                    style={[style.imageContainer, {width: this.maxImageWidth + VIEWPORT_IMAGE_CONTAINER_OFFSET}]}
                >
                    <TouchableWithoutFeedback
                        onPress={this.handlePreviewImage}
                        style={{height, width}}
                    >
                        <ProgressiveImage
                            ref='image'
                            style={{height, width}}
                            imageUri={imageUri}
                            resizeMode='contain'
                        />
                    </TouchableWithoutFeedback>
                </View>
            );
        }

        return (
            <View>
                {preText}
                <View
                    onLayout={this.handleLayout}
                    style={[style.container, style.border, borderStyle]}
                >
                    <View style={{flex: 1, flexDirection: 'row'}}>
                        {author}
                    </View>
                    <View style={{flex: 1, flexDirection: 'row'}}>
                        {title}
                    </View>
                    {thumb}
                    {text}
                    {fields}
                    {actions}
                    {image}
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderBottomWidth: 1,
            borderRightWidth: 1,
            borderTopWidth: 1,
            marginTop: 5,
            padding: 10,
        },
        border: {
            borderLeftColor: changeOpacity(theme.linkColor, 0.6),
            borderLeftWidth: 3,
        },
        author: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
        },
        authorIcon: {
            height: 12,
            marginRight: 3,
            width: 12,
        },
        authorLink: {
            color: changeOpacity(theme.linkColor, 0.5),
        },
        title: {
            color: theme.centerChannelColor,
            fontWeight: '600',
            marginBottom: 5,
        },
        titleLink: {
            color: theme.linkColor,
        },
        topContent: {
            paddingRight: 60,
        },
        thumbContainer: {
            position: 'absolute',
            right: 10,
            top: 10,
        },
        thumb: {
            height: 45,
            width: 45,
        },
        headingContainer: {
            alignSelf: 'stretch',
            flexDirection: 'row',
            marginBottom: 5,
            marginTop: 10,
        },
        heading: {
            color: theme.centerChannelColor,
            fontWeight: '600',
        },
        bodyContainer: {
            flex: 1,
        },
        imageContainer: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderWidth: 1,
            borderRadius: 2,
            marginTop: 5,
            padding: 5,
        },
        actionsContainer: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
    };
});
