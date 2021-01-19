// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';

import AutocompleteSelector from 'app/components/autocomplete_selector';

type Props = {
    actions: {
        selectAttachmentMenuAction: (postId: string, actionId: string, text: string, value: string) => void;
    };
    id: string;
    name: string;
    dataSource?: string;
    defaultOption?: string;
    options?: Option[];
    postId: string;
    selected?: Option;
    disabled?: boolean;
}

type State = {
    selected?: Option;
}

type Option = {
    text: string;
    value: string;
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

    handleSelect = (selected?: Option) => {
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
