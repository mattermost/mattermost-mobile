// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import AutocompleteSelector from 'app/components/autocomplete_selector';

export default class ActionMenu extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            selectAttachmentMenuAction: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        dataSource: PropTypes.string,
        defaultOption: PropTypes.string,
        options: PropTypes.arrayOf(PropTypes.object),
        postId: PropTypes.string.isRequired,
        selected: PropTypes.object,
    };

    constructor(props) {
        super(props);

        let selected;
        if (props.defaultOption && props.options) {
            selected = props.options.find((option) => option.value === props.defaultOption);
        }

        this.state = {
            selected,
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.selected && props.selected !== state.selected) {
            return {
                selected: props.selected,
            };
        }

        return null;
    }

    handleSelect = (selected) => {
        if (!selected) {
            return;
        }

        const {
            actions,
            id,
            postId,
        } = this.props;

        actions.selectAttachmentMenuAction(postId, id, selected.text, selected.value);
    };

    render() {
        const {
            name,
            dataSource,
            options,
        } = this.props;
        const {selected} = this.state;

        return (
            <AutocompleteSelector
                placeholder={name}
                dataSource={dataSource}
                options={options}
                selected={selected}
                onSelected={this.handleSelect}
            />
        );
    }
}
