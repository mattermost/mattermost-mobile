// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type WithRunId = {
    run_id: string;
}
type WithChecklistId = {
    checklist_id: string;
}

type WithAttributeId = {
    attribute_id: string;
}

type PartialWithId<T extends {id: string}> = Partial<T> & Pick<T, 'id'>;

type PartialPlaybookRun = PartialWithId<PlaybookRun>;
type PartialChecklist = PartialWithId<PlaybookChecklist> & WithRunId;
type PartialChecklistItem = PartialWithId<PlaybookChecklistItem> & WithChecklistId;

// Types matching API naming (property_field/property_value)
type PartialPlaybookRunPropertyField = PartialWithId<PlaybookRunPropertyField>;

type PartialPlaybookRunPropertyValue = PartialWithId<PlaybookRunPropertyValue>;
