// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import React, {PropTypes, PureComponent} from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {concatStyles} from 'app/utils/theme';

import MarkdownBlockQuote from './markdown_block_quote';
import MarkdownCodeBlock from './markdown_code_block';
import MarkdownImage from './markdown_image';
import MarkdownLink from './markdown_link';
import MarkdownList from './markdown_list';
import MarkdownListItem from './markdown_list_item';

export default class Markdown extends PureComponent {
    static propTypes = {
        baseTextStyle: CustomPropTypes.Style,
        textStyles: PropTypes.object,
        blockStyles: PropTypes.object,
        value: PropTypes.string.isRequired
    };

    static defaultProps = {
        textStyles: {},
        blockStyles: {}
    };

    constructor(props) {
        super(props);

        this.parser = new Parser();
        this.renderer = this.createRenderer();
    }

    createRenderer = () => {
        return new Renderer({
            renderers: {
                text: this.renderText,

                emph: Renderer.forwardChildren,
                strong: Renderer.forwardChildren,
                code: this.renderCodeSpan,
                link: MarkdownLink,
                image: MarkdownImage,

                paragraph: this.renderParagraph,
                heading: this.renderHeading,
                codeBlock: this.renderCodeBlock,
                blockQuote: this.renderBlockQuote,

                list: this.renderList,
                item: this.renderListItem,

                hardBreak: this.renderHardBreak,
                thematicBreak: this.renderThematicBreak,
                softBreak: this.renderSoftBreak,

                htmlBlock: this.renderHtml,
                htmlInline: this.renderHtml
            }
        });
    }

    computeTextStyle = (baseStyle, context) => {
        return concatStyles(baseStyle, context.map((type) => this.props.textStyles[type]));
    }

    renderText = ({literal, context}) => {
        // Construct the text style based off of the parents of this node since RN's inheritance is limited
        return <Text style={this.computeTextStyle(this.props.baseTextStyle, context)}>{literal}</Text>;
    }

    renderCodeSpan = ({literal, context}) => {
        return <Text style={this.computeTextStyle(this.props.textStyles.code, context)}>{literal}</Text>;
    }

    renderParagraph = ({children}) => {
        return (
            <View style={[style.block, this.props.blockStyles.paragraph]}>
                {children}
            </View>
        );
    }

    renderHeading = ({children, level}) => {
        return (
            <View style={[style.block, this.props.blockStyles[`heading${level}`]]}>
                {children}
            </View>
        );
    }

    renderCodeBlock = (props) => {
        // These sometimes include a trailing newline
        const contents = props.literal.replace(/\n$/, '');

        return (
            <MarkdownCodeBlock
                blockStyle={this.props.blockStyles.codeBlock}
                textStyle={concatStyles(this.props.baseTextStyle, this.props.textStyles.codeBlock)}
            >
                {contents}
            </MarkdownCodeBlock>
        );
    }

    renderBlockQuote = ({children, ...otherProps}) => {
        return (
            <MarkdownBlockQuote
                blockStyle={style.block}
                bulletStyle={this.props.baseTextStyle}
                {...otherProps}
            >
                {children}
            </MarkdownBlockQuote>
        );
    }

    renderList = ({children, type, start}) => {
        return (
            <MarkdownList
                ordered={type !== 'bullet'}
                startAt={start}
            >
                {children}
            </MarkdownList>
        );
    }

    renderListItem = ({children, ...otherProps}) => {
        return (
            <MarkdownListItem
                blockStyle={style.block}
                bulletStyle={this.props.baseTextStyle}
                {...otherProps}
            >
                {children}
            </MarkdownListItem>
        );
    }

    renderHardBreak = () => {
        return <View/>;
    }

    renderThematicBreak = () => {
        return <View style={this.props.blockStyles.horizontalRule}/>;
    }

    renderSoftBreak = () => {
        // Render a large, empty view and have it shrink to fill the remaining space to force a line break
        return <View style={style.softBreak}/>;
    }

    renderHtml = () => {
        return null;
    }

    render() {
        const ast = this.parser.parse(this.props.value);

        return <View>{this.renderer.render(ast)}</View>;
    }
}

const style = StyleSheet.create({
    block: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    softBreak: {
        flexBasis: 1000000,
        flexShrink: 1
    }
});
