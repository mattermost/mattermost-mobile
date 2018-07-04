// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Parser} from 'commonmark';
import Renderer from 'commonmark-react-renderer';
import PropTypes from 'prop-types';
import React from 'react';
import {Text} from 'react-native';

export default class RemoveMarkdown extends React.PureComponent {
    static propTypes = {
        value: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);

        this.parser = this.createParser();
        this.renderer = this.createRenderer();
    }

    createParser = () => {
        return new Parser();
    };

    createRenderer = () => {
        return new Renderer({
            renderers: {
                text: this.renderText,

                emph: Renderer.forwardChildren,
                strong: Renderer.forwardChildren,
                del: Renderer.forwardChildren,
                code: Renderer.forwardChildren,
                link: Renderer.forwardChildren,
                atMention: Renderer.forwardChildren,
                channelLink: Renderer.forwardChildren,
                emoji: this.renderNull,

                paragraph: Renderer.forwardChildren,
                heading: Renderer.forwardChildren,
                codeBlock: this.renderNull,
                blockQuote: this.renderNull,

                list: this.renderNull,
                item: this.renderNull,

                hardBreak: this.renderNull,
                thematicBreak: this.renderNull,
                softBreak: this.renderNull,

                htmlBlock: this.renderNull,
                htmlInline: this.renderNull,

                table: this.renderNull,
                table_row: this.renderNull,
                table_cell: this.renderNull,
            },
        });
    };

    renderText = ({literal}) => {
        return <Text>{literal}</Text>;
    };

    renderNull = () => {
        return null;
    };

    render() {
        const ast = this.parser.parse(this.props.value);

        return <Text>{this.renderer.render(ast)}</Text>;
    }
}
