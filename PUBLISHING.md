# Publishing checklist

Everything below runs from this directory. The package, its manifest and the
local git history are ready; only the two account steps (GitHub, npm) are left.

## 1. Publish to npm

```powershell
npm login                       # once per machine
npm publish                     # dsh-turn-time 1.0.0
```

A brand-new package name is not always installable the moment `publish`
returns. Verify the artifact, not the message:

```powershell
npm view dsh-turn-time dist-tags.latest    # must be 1.0.0
npm view dsh-turn-time dist.tarball        # must download
```

If a registry mirror still serves a placeholder `latest`, ask it to refetch and
wait a few minutes:

```powershell
curl.exe -X PUT https://registry.npmmirror.com/dsh-turn-time/sync
```

## 2. Push the repository

```powershell
git remote add origin https://github.com/monkey6501/dsh-turn-time.git
git push -u origin main
```

Then, on GitHub:

- make the repository **public**;
- add the **`dsh-plugin`** topic;
- keep it alive for at least a day before submitting (the catalog CI rejects
  repositories younger than that).

## 3. List it in the market catalog

The community market reads [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin).
Fork it and add exactly one file, `data/plugins/monkey6501__dsh-turn-time.yml`:

```yaml
url: https://github.com/monkey6501/dsh-turn-time
name: monkey6501/dsh-turn-time
category: usage
icon: https://raw.githubusercontent.com/monkey6501/dsh-turn-time/main/assets/icon-180.png
description:
  en: "Shows how long the current task took and the session total below the composer, with the task's model time, tool time and step count."
  zh: 在输入框下方显示本轮任务耗时与本会话累计耗时，并可展开查看本轮的模型用时、工具用时和步骤数。
```

Rules worth re-reading before submitting:

- only `description.en` is required, one line, accurate — a maintainer checks it
  against the code;
- a description containing `: ` must be quoted;
- at most three entries per pull request;
- `icon` must be a GitHub-hosted raster image (the SVG here is the in-app icon;
  `assets/icon-180.png` is the storefront tile).

CI runs, in order: entry count → `dsh.bundle` present in the repo's
`package.json` → repository age → awesome-lint and the site build.

## 4. Releasing an update

Bump `version` in `package.json`, `npm publish`, and tag the commit
(`git tag v1.0.3 && git push --tags`). The market compares the npm version (or
the pinned commit) and shows an update on its own; the catalog entry needs no
change.

## Checking the artifact locally

```powershell
npm pack --dry-run      # the files npm would publish
```

The packed tarball must contain `package.json`, `index.js`, `client.js`,
`cordis.patch.yml`, `locale/*.json`, `icon.svg`, `README.md` and `LICENSE` —
`files` in `package.json` controls that list.
