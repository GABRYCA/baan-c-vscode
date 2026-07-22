# Snippets

Snippets are contributed for language `baanc` from `snippets/baanc.json`.

**How to use:** type the **prefix**, then accept the suggestion (`Tab` / `Enter`).  
Tab stops (`$1`, `$2`, …) move with `Tab`. Linked placeholders update together (e.g. table name in select snippets).

---

## Control flow

| Prefix | Name | Inserts |
| --- | --- | --- |
| `if` | If then endif | `if … then` / `endif` |
| `ife` | If then else endif | `if` / `else` / `endif` |
| `ifel` | If elif else endif | `if` / `elif` / `else` / `endif` |
| `while` | While endwhile | `while` / `endwhile` |
| `for` | For endfor | `for i = 1 to n` / `endfor` |
| `fors` | For step endfor | `for … step …` / `endfor` |
| `repeat` | Repeat until | `repeat` / `until` |
| `oncase` | On case | `on case` / `case` / `default` / `endcase` |
| `oncases` | On case string | String-oriented `on case` skeleton |

---

## Functions

| Prefix | Name | Inserts |
| --- | --- | --- |
| `func` | Function void | `function name(…)` with braces |
| `funcl` | Function typed | Typed return (`long` / `double` / `string` / `void`) + `return` |
| `funcex` | Function extern long | `function extern long …` pattern |
| `proto` | Prototype | Function prototype declaration |

---

## Declarations

| Prefix | Name | Inserts |
| --- | --- | --- |
| `domain` | Domain declaration | Domain declaration line |
| `table` | Table declaration | `table` declaration |
| `long` | Long declaration | `long` variable |
| `string` | String declaration | `string` variable |
| `boolean` | Boolean declaration | `boolean` variable |
| `double` | Double declaration | `double` variable |
| `extern` | Extern long | `extern long` declaration |

---

## Embedded SQL & transactions

Select snippets use **`table.*`** (not bare `*`) with linked table placeholders and column-aligned clauses.

| Prefix | Name | Inserts |
| --- | --- | --- |
| `select` | Select block | Basic select / selectdo / endselect |
| `selectf` | Select full | Full select with empty/error branches |
| `txselect` | Transaction with select for update | Retry + for update + commit/abort style flow |
| `sqlpf` | SQL parse exec fetch | Parse / execute / fetch helper pattern |
| `qext` | Query extend where | Query-extend / where helper pattern |
| `retry` | Db retry point | `db.retry.point()` usage |
| `commit` | Commit transaction | `commit.transaction()` |
| `abort` | Abort transaction | `abort.transaction()` |
| `elocked` | Error check ELOCKED | Lock-error handling pattern |

Equivalent command templates (not prefixes):

- **Baan C: Insert Select Template**
- **Baan C: Insert Transaction + Select Template**

Example shape after expanding `selectf`:

```baanc
select  table.*
from    table
where   table.field
selectdo
	|
selectempty
	|
selecterror
	|
endselect
```

---

## Preprocessor

Prefixes that start with `#` replace a partially typed `#…` so you do not get `##define`.

| Prefix | Name | Inserts |
| --- | --- | --- |
| `#include` / `include` | Include quotes | `#include "filename"` |
| `#include<` / `include<` | Include angle | `#include <filename>` |
| `#define` / `define` | Define macro | `#define NAME value` |
| `#undef` / `undef` | Undef macro | `#undef NAME` |
| `#if` / `ppif` | If preprocessor | `#if` … `#endif` |
| `#ifdef` / `ifdef` | Ifdef block | `#ifdef` … `#endif` |
| `#ifndef` / `ifndef` | Ifndef block | `#ifndef` … `#endif` |
| `#pragma` / `pragma` | Pragma | `#pragma …` |
| `#ident` / `ident` | Ident | `#ident "@(#)…"` |

---

## 4GL sections

| Prefix | Name | Typical section |
| --- | --- | --- |
| `declaration` | 4GL declaration section | `declaration:` |
| `before.program` / `before.` | 4GL before.program | `before.program:` |
| `after.program` | 4GL after.program | `after.program:` |
| `before.checks` / `before.ch` | 4GL before.checks | `before.checks:` |
| `when.field.changes` | 4GL when.field.changes | field change hook |
| `field.` | 4GL field section | `field.table.field:` |
| `after.field` | 4GL after.field | `after.field:` |
| `check.input` | 4GL check.input | input validation |
| `choice.` | 4GL choice section | `choice.…:` |
| `main.table.io` | 4GL main.table.io | `main.table.io:` |

Typing after a trailing dot (e.g. `before.`) continues to match dotted 4GL completions.

---

## APIs & patterns

| Prefix | Name | Inserts |
| --- | --- | --- |
| `message` | Message | `message("…")` |
| `dalgs` | DAL get and save object | DAL get/save skeleton |
| `httpget` | HTTP GET pattern | HTTP client GET flow |
| `curlget` | cURL download string | cURL download skeleton |

---

## Tips

1. **Snippets vs completions** — Snippets appear alongside keyword/builtin completions. Use the description/detail column to pick the right item.
2. **SQL alignment** — After inserting a select snippet, run **Format Document** if you have mixed hand-edited clauses; the formatter re-aligns SQL keywords.
3. **Disable a category of keyword completions** — Snippets remain available even if you turn off builtin/SQL completion settings; only dynamic completion sources are gated (see [Configuration](./configuration.md)).
4. **Discover all snippets** — Command Palette → **Snippets: Insert Snippet** while a Baan file is focused.
