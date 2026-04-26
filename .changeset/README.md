# Changesets

This directory holds [changesets](https://github.com/changesets/changesets) — small markdown files that describe changes to the package.

## Adding a changeset

```sh
npx changeset
```

Pick the bump type (patch / minor / major), write a short summary. Commit the generated `.md` file with your PR.

## Releasing

```sh
npx changeset version   # rolls package.json version + writes CHANGELOG.md
npx changeset publish   # publishes to the registry
```
