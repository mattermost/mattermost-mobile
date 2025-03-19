// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Command = {
    'id': string;
    'token': string;
    'create_at': number;
    'update_at': number;
    'delete_at': number;
    'creator_id': string;
    'team_id': string;
    'trigger': string;
    'method': 'P' | 'G' | '';
    'username': string;
    'icon_url': string;
    'auto_complete': boolean;
    'auto_complete_desc': string;
    'auto_complete_hint': string;
    'display_name': string;
    'description': string;
    'url': string;
    'autocomplete_icon_data'?: string;
};

type CommandArgs = {
    channel_id: string;
    team_id: string;
    root_id?: string;
    parent_id?: string;
};

// AutocompleteSuggestion represents a single suggestion downloaded from the server.
type AutocompleteSuggestion = {
    Complete: string;
    Suggestion: string;
    Hint: string;
    Description: string;
    IconData: string;
};

type DialogSubmission = {
    url: string;
    callback_id: string;
    state: string;
    user_id: string;
    channel_id: string;
    team_id: string;
    submission: {
        [x: string]: string;
    };
    cancelled: boolean;
};

type DialogOption = {
    text: string;
    value: string;
};

type SelectedDialogOption = DialogOption | DialogOption[] | undefined;

type SelectedDialogValue = string | string[] | undefined;

type DialogElement = {
    display_name: string;
    name: string;
    type: InteractiveDialogElementType;
    subtype: InteractiveDialogTextSubtype;
    default: string | boolean;
    placeholder: string;
    help_text: string;
    optional: boolean;
    min_length: number;
    max_length: number;
    data_source: string;
    options: DialogOption[];
};

type InteractiveDialogConfig = {
    app_id: string;
    trigger_id: string;
    url: string;
    dialog: {
        callback_id: string;
        title: string;
        introduction_text: string;
        icon_url?: string;
        elements: DialogElement[];
        submit_label: string;
        notify_on_cancel: boolean;
        state: string;
    };
};

type PostAction = {
    id?: string;
    type?: string;
    name?: string;
    disabled?: boolean;
    style?: string;
    data_source?: string;
    options?: PostActionOption[];
    default_option?: string;
    integration?: PostActionIntegration;
    cookie?: string;
};

type PostActionOption = {
    text?: string;
    value?: string;
};

type PostActionIntegration = {
    url?: string;
    context?: Record<string, any>;
}

type PostActionResponse = {
    status: string;
    trigger_id: string;
};

type InteractiveDialogElementType = 'text' | 'textarea' | 'select' | 'radio' | 'bool'
type InteractiveDialogTextSubtype = 'email' | 'number' | 'tel' | 'url' | 'password'
