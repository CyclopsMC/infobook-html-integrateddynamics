#!/usr/bin/env python3
"""
Patch modpack.json so that third-party mods (those whose Maven groupId does
not start with 'org.cyclops.') use modmaven.dev instead of the CyclopsMC
GitHub Maven registry.

The PomConverter tool assigns all dependencies to the first repository listed
in settings.xml (the authenticated GitHub Maven registry).  Packages like
Mekanism are not published there, but are available on modmaven.dev.
"""
import json
import sys

MODMAVEN_URL = 'https://modmaven.dev'
CYCLOPS_PREFIX = 'org.cyclops.'


def fix_repos(path: str = 'modpack.json') -> None:
    with open(path) as f:
        data = json.load(f)

    for mod in data['mods']:
        group_id = mod['artifact'].split(':')[0]
        if not group_id.startswith(CYCLOPS_PREFIX):
            mod['repo'] = MODMAVEN_URL
            mod.pop('headers', None)

    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f'Fixed third-party mod repos in {path}')


if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'modpack.json'
    fix_repos(path)
