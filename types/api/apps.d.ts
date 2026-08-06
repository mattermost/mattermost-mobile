// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type AppCall = {
    path?: string;
    expand?: AppExpand;
    state?: any;
};

type AppCallResponseType = string;

type AppCallResponse<Res = unknown> = {
    type: AppCallResponseType;
    text?: string;
    data?: Res;
    navigate_to_url?: string;
    use_external_browser?: boolean;
    call?: AppCall;
    form?: AppForm;
    app_metadata?: AppMetadataForClient;
};

type AppMetadataForClient = {
    bot_user_id: string;
    bot_username: string;
};

type AppExpandLevel = string;

type AppExpand = {
    app?: AppExpandLevel;
    acting_user?: AppExpandLevel;
    channel?: AppExpandLevel;
    config?: AppExpandLevel;
    mentioned?: AppExpandLevel;
    parent_post?: AppExpandLevel;
    post?: AppExpandLevel;
    root_post?: AppExpandLevel;
    team?: AppExpandLevel;
    user?: AppExpandLevel;
};

type AppForm = {
    title?: string;
    header?: string;
    footer?: string;
    icon?: string;
    submit_buttons?: string;
    submit_label?: string;
    cancel_button?: boolean;
    submit_on_cancel?: boolean;
    fields?: AppField[];

    // source is used in 2 cases:
    //   - if submit is not set, it is used to fetch the submittable form from
    //     the app.
    //   - if a select field change triggers a refresh, the form is refreshed
    //     from source.
    source?: AppCall;

    // submit is called when one of the submit buttons is pressed, or the
    // command is executed.
    submit?: AppCall;

    depends_on?: string[];
};

type AppFormValue = string | boolean | number | AppSelectOption | AppSelectOption[] | null;
type AppFormValues = {[name: string]: AppFormValue};

type AppSelectOption = {
    label?: string;
    value?: string;
    icon_data?: string;
};

type AppFieldType = string;

// This should go in mattermost-redux
type AppField = {

    // Name is the name of the JSON field to use.
    name?: string;
    type?: AppFieldType;
    is_required?: boolean;
    readonly?: boolean;

    // Present (default) value of the field
    value?: AppFormValue;

    description?: string;

    label?: string;
    hint?: string;
    position?: number;

    modal_label?: string;

    // Select props
    refresh?: boolean;
    options?: AppSelectOption[];
    multiselect?: boolean;
    lookup?: AppCall;

    // Text props
    subtype?: string;
    min_length?: number;
    max_length?: number;

    // Date/DateTime props
    min_date?: string;
    max_date?: string;
    time_interval?: number;
    datetime_config?: DateTimeConfig;
};

type DateTimeConfig = {
    time_interval?: number;
    location_timezone?: string;
    allow_manual_time_entry?: boolean;
};

type FormResponseData = {
    errors?: {
        [field: string]: string;
    };
}

type AppLookupResponse = {
    items: AppSelectOption[];
}

type DoAppCallResult<Res=unknown> = {
    data?: AppCallResponse<Res>;
    error?: AppCallResponse<Res>;
}
