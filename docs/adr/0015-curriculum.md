# ADR 0015: A 205-problem curriculum, derived and never invented

**Status:** accepted, 2026-11-22

## Context

Pillow had six excellent lessons and no plan. Students preparing for
interviews by April 2027 need to know what to study each week, in an order
where every idea builds on the last. The brief asked for 180–220 problems,
with no fabricated problem identifiers.

## Decisions

1. **Source lists, not memory.** The problems are Blind 75, NeetCode 150
   and Grind 169, extracted from
   [sumitsingh4411/faang](https://github.com/sumitsingh4411/faang) (MIT)
   by `scripts/build-curriculum.ts`.
   - **Size:** deduplicated, that's 205 problems.
   - **Attribution:** the commit and copyright notice are kept in
     `sources.json` and shown on the roadmap.
2. **The slug is the ID.** URLs are built from it.
   - **Problem numbers:** shown only where a lesson's author verified
     them. LeetCode's API refused automated requests (403), and that
     wasn't worked around.
   - **Company tags:** dropped, because they're unverifiable.
3. **Derived, not hand-placed.** Tiers, concepts, weeks and prerequisites
   are computed from the lists' topics and the ontology, so they're
   deterministic and testable.
   - **Tiers:** core is Blind 75 or all three lists; reinforcement is two
     lists; stretch is one list.
   - **Weeks:** a problem goes in the first week by which all its required
     concepts are taught.
   - **Disagreements between lists:** where lists label a problem
     differently, the alternative labels never push it later.
   - **Review status:** every problem is `review: "auto"` until a person
     checks its tags.
4. **Ontology grows to the syllabus.** 29 new concepts, from counting to
   minimum spanning trees.
   - **Node kinds:** every concept now has a kind (foundation, structure or
     technique).
   - **Facts:** concept facts are curated by hand, as before.
5. **Position from evidence.** The roadmap's current week is the first
   week with a concept that isn't understood. Next is the first
   unsolved problem with a built lesson from there. Students never tick
   things off by hand.
6. **Planned lessons link out.** Problems without a lesson link to
   LeetCode, labelled as such, until their lesson is built.

## Consequences

- Only six of the 205 problems have lessons. Building the rest through
  the reviewed pipeline is now the main content task.
- With 55 concepts, the map's "Not met yet" group is long. Grouping by
  week or kind is a follow-up.
- Week 16 has no new problems: it's for review and Interview Mode (P7).
