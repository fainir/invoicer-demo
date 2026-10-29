# Harness notes - invoicer-demo

One line per friction point: project | phase | what happened | cause | proposed harness change.
(`~/.agents/skills/learn/scripts/note.sh` did not exist when this session started, so notes go here.)

- invoicer-demo | scope | The learn skill and note.sh did not exist, fell back to this file | learn skill still being written in the parent session | ship skill should name the fallback file explicitly so every session logs friction the same way
- invoicer-demo | scope | ship skill phase 0 says "create the folder under ~/Documents/<slug>" but Nir's repos live in ~/Documents/GitHub | default path in the skill does not match the owner's layout | make the default `~/Documents/GitHub/<slug>` or read it from OWNER.md / a global config
- invoicer-demo | spec | design-quality rules forbid system fonts, but a product with "no network calls" cannot load web fonts | rule assumes online products | add an exception: offline or no-network products use a deliberate system stack and record it as a decision
- invoicer-demo | spec | ship says "parallel QA needs workflows opt-in (ultracode)"; a session started by another session cannot opt in on the user's behalf | Workflow tool requires the user's own words | ship should say: without opt-in, spawn qa-user agents directly, one per flow, and how they share or avoid the single browser pane
