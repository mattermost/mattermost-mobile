// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    Linking,
    Text,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import CustomPropTypes from 'app/constants/custom_prop_types';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import InteractiveAction from './interactive_action';

export default class SlackAttachment extends PureComponent {
    static propTypes = {
        attachment: PropTypes.object.isRequired,
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        postId: PropTypes.string.isRequired,
        onLongPress: PropTypes.func.isRequired,
        theme: PropTypes.object,
        textStyles: PropTypes.object
    };

    constructor(props) {
        super(props);

        this.state = this.getInitState();
    }

    getActionView = (style) => {
        const {attachment, postId} = this.props;
        const {actions} = attachment;

        if (!actions || !actions.length) {
            return null;
        }

        const buttons = [];

        actions.forEach((action) => {
            if (!action.id || !action.name) {
                return;
            }
            buttons.push(
                <InteractiveAction
                    key={action.id}
                    id={action.id}
                    name={action.name}
                    postId={postId}
                />
            );
        });

        return (
            <View style={style.actionsContainer}>
                {buttons}
            </View>
        );
    };

    getCollapsedText = () => {
        let text = this.props.attachment.text || '';
        if ((text.match(/\n/g) || []).length >= 5) {
            text = text.split('\n').splice(0, 5).join('\n');
        } else if (text.length > 400) {
            text = text.substr(0, 400);
        }

        return text;
    };

    getInitState = () => {
        const shouldCollapse = this.shouldCollapse();
        const uncollapsedText = this.props.attachment.text;
        const collapsedText = shouldCollapse ? this.getCollapsedText() : uncollapsedText;

        return {
            shouldCollapse,
            collapsedText,
            uncollapsedText,
            text: shouldCollapse ? collapsedText : uncollapsedText,
            collapsed: shouldCollapse
        };
    };

    getFieldsTable = (style) => {
        const {
            attachment,
            baseTextStyle,
            blockStyles,
            navigator,
            textStyles
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

    openLink = (link) => {
        if (Linking.canOpenURL(link)) {
            Linking.openURL(link);
        }
    };

    shouldCollapse = () => {
        const text = this.props.attachment.text || '';
        return (text.match(/\n/g) || []).length >= 5 || text.length > 400;
    };

    toggleCollapseState = () => {
        const state = this.state;
        const text = state.collapsed ? state.uncollapsedText : state.collapsedText;
        const collapsed = !state.collapsed;

        this.setState({collapsed, text});
    };

    render() { // eslint-disable-line complexity
        const {
            attachment,
            baseTextStyle,
            blockStyles,
            textStyles,
            navigator,
            theme
        } = this.props;

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
                    />
                </View>
            );
        }

        let borderStyle;
        if (attachment.color && attachment.color[0] === '#') {
            borderStyle = {borderLeftColor: attachment.color};
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
            let moreLess;
            if (this.state.shouldCollapse) {
                if (this.state.collapsed) {
                    moreLess = (
                        <FormattedText
                            id='post_attachment.more'
                            defaultMessage='Show more...'
                            onPress={this.toggleCollapseState}
                            style={style.moreLess}
                        />
                    );
                } else {
                    moreLess = (
                        <FormattedText
                            id='post_attachment.collapse'
                            defaultMessage='Show less...'
                            onPress={this.toggleCollapseState}
                            style={style.moreLess}
                        />
                    );
                }
            }

            text = (
                <View style={topStyle}>
                    <Markdown
                        baseTextStyle={baseTextStyle}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        value={this.state.text}
                        navigator={navigator}
                        onLongPress={this.props.onLongPress}
                    />
                    {moreLess}
                </View>
            );
        }

        const fields = this.getFieldsTable(style);
        const actions = this.getActionView(style);

        let image;
        if (attachment.image_url) {
            image = (
                <View style={style.imageContainer}>
                    <Image
                        source={{uri: attachment.image_url}}
                        style={style.image}
                    />
                </View>
            );
        }

        return (
            <View>
                {preText}
                <View style={[style.container, style.border, borderStyle]}>
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
            borderColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderWidth: 1,
            marginTop: 5,
            padding: 10
        },
        border: {
            borderLeftColor: changeOpacity(theme.linkColor, 0.6),
            borderLeftWidth: 3
        },
        author: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11
        },
        authorIcon: {
            height: 12,
            marginRight: 3,
            width: 12
        },
        authorLink: {
            color: changeOpacity(theme.linkColor, 0.5)
        },
        title: {
            color: theme.centerChannelColor,
            fontWeight: '600',
            marginBottom: 5
        },
        titleLink: {
            color: theme.linkColor
        },
        topContent: {
            paddingRight: 60
        },
        thumbContainer: {
            position: 'absolute',
            right: 10,
            top: 10
        },
        thumb: {
            height: 45,
            width: 45
        },
        moreLess: {
            color: theme.linkColor,
            fontSize: 12
        },
        headingContainer: {
            alignSelf: 'stretch',
            flexDirection: 'row',
            marginBottom: 5,
            marginTop: 10
        },
        heading: {
            color: theme.centerChannelColor,
            fontWeight: '600'
        },
        bodyContainer: {
            flex: 1
        },
        imageContainer: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderWidth: 1,
            borderRadius: 2,
            marginTop: 5
        },
        image: {
            flex: 1,
            height: 50
        },
        actionsContainer: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap'
        }
    };
});
