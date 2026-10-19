---
"@openui/cli": patch
---

Harden install writes: reject registry targets containing `..`, resolve targets
relative to the project root rather than the current directory, and skip
existing files unless `--overwrite` is passed.
