# Kopo Cli 🐶

*A Deno registry browser in the terminal*

## Description

`kopo` is a tool, which helps you browse the Deno registries in your terminal, search for a specific module.

It currently supports `deno.land/x` and `x.nest.land`.

## Usage

Run from the url:

```bash
deno run --unstable --allow-net https://deno.land/x/kopo/mod.ts
```

or install it like:

```bash
deno install --unstable --allow-net -f https://deno.land/x/kopo/mod.ts kopo
```

## Features

Features depend on the capabilities of the browsed module repository.

#### deno.land/x

- Browse a paginated list of the modules
- Search through the modules with a keyword
- Display basic information about the module
- Show the raw README of the module, if one exists in the module's repo
- Show the parsed flags from the README if provided.

#### x.nest.land

- Browse a paginated list of the modules
- Search through the modules with a keyword
- Display basic information about the module

### 🚩 Flags

> 🚧 This is just an experimental feature 🚧

This proposes a concept, where each module describes what are its required and optional flags in a parseable way.

#### How it works

The parser is [here](./flag_parser.ts)

Currently it searches for markdown table rows, which contain 2 or 3 columns.

- The first column needs to contain the flag inside backticks like ( `--unstable` ). things can be before it in the column, but not after, besides one space char.
- The second column indicates, whether the flag is required (`*`) or optional (empty). Putting `_` in this column tells the parser to ignore the row.
- The optional third column can serve as a description why the flag is needed.

A table could look something like this:

|Flag| R |Reason|
|:--|:-:|:--|
| 🚧 `--unstable` | * | Needed for [Cliffy](https://github.com/c4spar/deno-cliffy) to work |
| 🌐 `--allow-net` | * | To fetch data from the repos |
| 🔍 `--allow-read` | _ | Needed for cache info |
| 💾 `--allow-write` | _ | Save favourites |
| ⏱ `--allow-hrtime` | _ | Allows precise benchmarking |
| ⚠ `--allow-run` | _ | Needed for feature x |
| 🧭 `--allow-env` | _ | Needed to access your ENV |
| 🧩 `--allow-plugin` | _ | Needed to use RUST plugins |
| 🔮 `--allow-all` | _ | It should never be required |

## Contribution

Issues, pull requests and feedback are always welcome.

## Licence

Copyright 2020- Szalay Kristóf. All rights reserved. MIT license.
