#!/usr/bin/env python3
"""
Patch modpack.json so that third-party Maven mods (those whose groupId does
not start with 'org.cyclops.') are converted to 'raw' type entries with
explicit download URLs.

This works around two bugs in the mvn-artifact-download library used by
cyclops-infobook-html when downloading unauthenticated Maven artifacts:

1. The repo URL is stored without a trailing slash, causing URL concatenation
   to omit the separator (e.g. "https://modmaven.devmekanism/...").
2. Four-part artifact coordinates (G:A:V:C) are mis-parsed as (G:A:extension:V),
   so the classifier ends up as the version in the constructed URL.

cyclops-infobook-html's own downloadMavenArtifact code path handles both
cases correctly, but is only triggered for mods that have auth headers.
Third-party public-repo mods (e.g. Mekanism) have no headers and therefore
hit the broken mvn-artifact-download path instead.
"""
import json
import sys

CYCLOPS_PREFIX = 'org.cyclops.'


def artifact_to_raw(artifact_str: str, repo_url: str) -> dict:
    """Build a 'raw' modpack entry for a Maven artifact coordinate string."""
    parts = artifact_str.split(':')
    group_id, artifact_id, version = parts[0], parts[1], parts[2]
    classifier = parts[3] if len(parts) > 3 else None
    group_path = group_id.replace('.', '/')
    suffix = f'-{classifier}' if classifier else ''
    filename = f'{artifact_id}-{version}{suffix}.jar'
    base = repo_url.rstrip('/')
    url = f'{base}/{group_path}/{artifact_id}/{version}/{filename}'
    return {'type': 'raw', 'url': url, 'name': filename}


def fix_repos(path: str = 'modpack.json') -> None:
    with open(path) as f:
        data = json.load(f)

    changed = 0
    for i, mod in enumerate(data['mods']):
        if mod.get('type') != 'maven':
            continue
        group_id = mod['artifact'].split(':')[0]
        if not group_id.startswith(CYCLOPS_PREFIX):
            data['mods'][i] = artifact_to_raw(mod['artifact'], mod['repo'])
            changed += 1

    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f'Fixed {changed} third-party mod(s) in {path}')


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'modpack.json'
    fix_repos(path)
