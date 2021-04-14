// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import {PostActionOption} from '@mm-redux/types/integration_actions';

type Props = {
    actions: {
        selectAttachmentMenuAction: (postId: string, actionId: string, text: string, value: string) => void;
    };
    id: string;
    name: string;
    dataSource?: string;
    defaultOption?: string;
    options?: PostActionOption[];
    postId: string;
    selected?: PostActionOption;
    disabled?: boolean;
}

type State = {
    selected?: PostActionOption;
}

export default class ActionMenu extends PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        let selected;
        if (props.defaultOption && props.options) {
            selected = props.options.find((option) => option.value === props.defaultOption);
        }

        this.state = {
            selected,
        };
    }

    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.selected && props.selected !== state.selected) {
            return {
                selected: props.selected,
            };
        }

        return null;
    }

    handleSelect = (selected?: PostActionOption) => {
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
            disabled,
        } = this.props;
        const {selected} = this.state;

        return (
            <AutocompleteSelector
                placeholder={name}
                dataSource={dataSource}
                options={options}
                selected={selected}
                onSelected={this.handleSelect}
                disabled={disabled}
            />
        );
    }
}
