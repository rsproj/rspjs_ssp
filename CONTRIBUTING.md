# Contributing

## Cloning PM2 development

```bash
$ git clone https://github.com/Unitech/ssp.git
$ cd ssp
$ git checkout development
$ npm install
```

I recommend having a ssp alias pointing to the development version to make it easier to use ssp development:

```
$ cd ssp/
$ echo "alias ssp='`pwd`/bin/ssp'" >> ~/.bashrc
```

You are now able to use ssp in dev mode:

```
$ ssp update
$ ssp ls
```

## Project structure

```
.
├── bin      // ssp, pmd, ssp-dev, ssp-docker are there
├── examples // examples files
├── lib      // source files
├── pres     // presentation files
├── test     // test files
└── types    // TypeScript definition files
```

## Modifying the Daemon

When you modify the Daemon (lib/Daemon.js, lib/God.js, lib/God/*, lib/Watcher.js), you must restart the ssp Daemon by doing:

```
$ ssp update
```

## Commit rules

### Commit message

A good commit message should describe what changed and why.

It should :
  * contain a short description of the change (preferably 50 characters or less)
  * be entirely in lowercase with the exception of proper nouns, acronyms, and the words that refer to code, like function/variable names
  * be prefixed with one of the following word
    * fix : bug fix
    * hotfix : urgent bug fix
    * feat : new or updated feature
    * docs : documentation updates
    * BREAKING : if commit is a breaking change
    * refactor : code refactoring (no functional change)
    * perf : performance improvement
    * style : UX and display updates
    * test : tests and CI updates
    * chore : updates on build, tools, configuration ...
    * Merge branch : when merging branch
    * Merge pull request : when merging PR

## Tests

There are two tests type. Programmatic and Behavioral.
The main test command is `npm test`

### Programmatic

Programmatic tests are runned by doing

```
$ bash test/ssp_programmatic_tests.sh
```

This test files are located in test/programmatic/*

### Behavioral

Behavioral tests are runned by doing:

```
$ bash test/e2e.sh
```

This test files are located in test/e2e/*

## File of interest

- `$HOME/.ssp` contain all PM2 related files
- `$HOME/.ssp/logs` contain all applications logs
- `$HOME/.ssp/pids` contain all applications pids
- `$HOME/.ssp/ssp.log` PM2 logs
- `$HOME/.ssp/ssp.pid` PM2 pid
- `$HOME/.ssp/rpc.sock` Socket file for remote commands
- `$HOME/.ssp/pub.sock` Socket file for publishable events

## Generate changelog

### requirements

```
npm install git-changelog -g
```

### usage

Edit .changelogrc
Change "version_name" to the next version to release (example 1.1.2).
Change "tag" to the latest existing tag (example 1.1.1).

Run the following command into ssp directory
```
git-changelog
```

It will generate currentTagChangelog.md file.
Just copy/paste the result into changelog.md
