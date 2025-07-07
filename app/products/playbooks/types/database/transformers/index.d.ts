// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PlaybookChecklistWithRun = PlaybookChecklist & {
    run_id: string;
}

type PlaybookChecklistItemWithChecklist = PlaybookChecklistItem & {
    checklist_id: string;
}
