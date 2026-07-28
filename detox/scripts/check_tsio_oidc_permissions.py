#!/usr/bin/env python3
"""Fail if a job invoking a TSIO script that mints an OIDC token lacks id-token: write.

mintOidcToken() reads ACTIONS_ID_TOKEN_REQUEST_URL, which GitHub only injects when the
job declares permissions.id-token: write. Without it the scripts warn and exit 0, so the
commit status / channel rollup is silently skipped instead of failing loudly.
"""
import glob
import os
import sys

import yaml

# Scripts that call mintOidcToken().
OIDC_SCRIPTS = ('tsio-report-status.js', 'tsio-channel-notify-rollup.js')

DEFAULT_WORKFLOW_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', '..', '.github', 'workflows'
)


def grants_id_token(permissions):
    if permissions == 'write-all':
        return True
    if isinstance(permissions, dict):
        return permissions.get('id-token') == 'write'
    return False


def step_invokes_oidc_script(step):
    """True when the step actually runs one of the scripts (not just checks it out)."""
    run = step.get('run')
    if not isinstance(run, str):
        return False
    return any(f'node detox/utils/{name}' in run for name in OIDC_SCRIPTS)


def main():
    workflow_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_WORKFLOW_DIR
    problems = []

    for path in sorted(glob.glob(os.path.join(workflow_dir, '*.yml'))):
        try:
            doc = yaml.safe_load(open(path)) or {}
        except yaml.YAMLError as err:
            problems.append(f'{os.path.basename(path)}: unparseable YAML: {err}')
            continue

        workflow_perms = doc.get('permissions')
        for job_id, job in (doc.get('jobs') or {}).items():
            if not isinstance(job, dict):
                continue
            steps = job.get('steps')
            if not isinstance(steps, list):
                continue
            if not any(step_invokes_oidc_script(s) for s in steps if isinstance(s, dict)):
                continue
            # Job-level permissions replace workflow-level ones entirely.
            effective = job.get('permissions', workflow_perms)
            if not grants_id_token(effective):
                problems.append(
                    f'{os.path.basename(path)}: job "{job_id}" runs a TSIO OIDC script '
                    'but does not declare permissions.id-token: write'
                )

    for problem in problems:
        print(f'  {problem}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
