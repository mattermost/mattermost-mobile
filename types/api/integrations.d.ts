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
    type?: string;

    /** Server file IDs collected from `file` elements, capped at MAX_DIALOG_FILE_IDS. */
    file_ids?: string[];
};

type DialogOption = {
    text: string;
    value: string;
};

/** Response body for POST /actions/dialogs/submit (and /refresh via `type: 'refresh'` requests). */
type SubmitDialogResponse = {
    error?: string;
    errors?: Record<string, string>;
    type?: string;
    form?: Dialog;
};

/** Response body for POST /actions/dialogs/lookup. */
type LookupDialogResponse = {
    items?: DialogOption[];
};

type SelectedDialogOption = DialogOption | DialogOption[] | undefined;

type SelectedDialogValue = string | string[] | undefined;

type DialogElement = {
    display_name: string;
    name: string;
    type: InteractiveDialogElementType;
    subtype?: InteractiveDialogTextSubtype;
    default: string | boolean;
    placeholder: string;
    help_text: string;
    optional: boolean;
    min_length: number;
    max_length: number;
    data_source: string;
    data_source_url?: string;
    options: DialogOption[];
    multiselect?: boolean;
    refresh?: boolean;
    allow_multiple?: boolean;
    action_button?: {
        url?: string;
        context?: Record<string, string>;
    };

    // Date/DateTime fields
    min_date?: string;
    max_date?: string;
    time_interval?: number;
    datetime_config?: DateTimeConfig;
};

type Dialog = {
    callback_id?: string;
    elements?: DialogElement[];
    title: string;
    introduction_text?: string;
    icon_url?: string;
    submit_label?: string;
    notify_on_cancel?: boolean;
    state?: string;
    source_url?: string;
};

/** Blocks-mode dialog payload (counterpart to legacy Dialog). */
type BlockDialogButton = {
    label?: string;

    /** Action id that must exist in block_dialog.actions. */
    action?: string;
};

type BlockDialog = {
    title: string;
    icon_url?: string;
    notify_on_cancel?: boolean;
    state?: string;

    /** When set, renders a footer submit button (default label "Submit"). */
    submit?: BlockDialogButton;

    /** When set, renders a footer cancel button (default label "Cancel"); header X also invokes it. */
    cancel?: BlockDialogButton;
    blocks: MmBlock[];

    /** Plaintext actions map on open; encrypted cookie string after server processing / on WS. */
    actions?: Record<string, unknown> | string;
};

/**
 * Open-dialog WS / IntegrationsManager payload.
 * Legacy mode uses `url` + `dialog`; blocks mode uses `block_dialog` (+ `channel_id`).
 */
type InteractiveDialogConfig = {
    app_id?: string;
    trigger_id: string;
    url?: string;
    channel_id?: string;
    dialog?: Dialog;
    block_dialog?: BlockDialog;
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

/** `integration_format` on the do-post-action API body — identifies which format originally had the action. */
type PostActionIntegrationFormat =
    | 'attachment'
    | 'apps_binding'
    | 'block'
    | 'card'
    | 'mm_block';

type PostActionResponse = {
    status: string;
    trigger_id: string;
    goto_location?: string;
};

/** Subtype for POST /api/v4/actions/blocks/do — empty defaults to execute on the server. */
type BlockActionSubtype = 'execute' | 'lookup';

/** Where the block action was triggered — required on doBlockAction requests. */
type BlockActionContext = 'post' | 'dialog';

type DoBlockActionRequest = {
    subtype?: BlockActionSubtype;

    /** Where the action was triggered: post interactive message or interactive dialog. */
    context: BlockActionContext;

    /** Optional for dialog-scoped cookies (empty post_id). Required when resolving from a stored post. */
    post_id?: string;

    /**
     * Current channel — dialog context only. Used server-side for ephemeral posts;
     * not forwarded to the upstream integration request.
     */
    channel_id?: string;
    action_id: string;
    cookie?: string;
    selected_option?: string;
    query?: Record<string, string>;
    form_values?: Record<string, string | string[] | boolean | number | null>;
    integration_format?: PostActionIntegrationFormat;
};

type DialogSelectOption = DialogOption;

type DoBlockActionResponse = {
    trigger_id?: string;
    goto_location?: string;
    error?: string;
    errors?: Record<string, string>;
    type?: '' | 'ok' | 'refresh' | 'dialog';
    mm_blocks?: unknown[];

    /** Opaque encrypted cookie string for subsequent do-block-action calls. */
    mm_blocks_actions?: string;

    /** New stacked dialog (type "dialog") or in-place refresh when context is dialog (type "refresh"). */
    block_dialog?: BlockDialog;

    /** When true in dialog context, leave the current dialog open (e.g. after stacking a child). */
    keep_dialog_open?: boolean;
    items?: DialogSelectOption[];
};

type InteractiveDialogElementType =
    | 'text'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'bool'
    | 'date'
    | 'datetime'
    | 'file'
    | 'action_button';
type InteractiveDialogTextSubtype = 'email' | 'number' | 'tel' | 'url' | 'password'
