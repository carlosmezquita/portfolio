# Private portfolio admin

## Context

Carlos opens a browser at his desk in daylight to scan recent portfolio interest, then narrows the date range if an action count changed. A light paper surface matches the existing portfolio and keeps report text comfortable to read.

## Visual system

Restrained warm neutrals with dark blue text and teal for selected controls and chart bars. Use OKLCH tokens, no gradients, no decorative imagery, no shadows and no entry animation. System sans-serif type for headings, controls and tabular numbers.

## Structure

A compact identity/header row, report title and labelled date range. A flat summary strip with five labelled action totals, followed by a daily activity chart and a target breakdown table. Use rules and whitespace rather than nested panels. On phones, the strip wraps and controls stack; the table remains horizontally scrollable inside its own region.

The header connects Statistics, Requests and Site content. Requests uses expandable messages with status controls and a filter. Site content uses persistent labels, generous text fields and a single publish action; original values can be restored from a secondary disclosure. Neither view introduces decorative panels or new visual tokens.

## States

Server-render the current report. Empty results explain that tracking begins after the frontend PR is published. Database errors offer retry and never masquerade as zero traffic. A signed-in report links to public analytics privacy choices and a local Access logout link. Controls have clear hover/focus/disabled states.

## Data presentation

Days are UTC and explicitly labelled. Date choices are 7, 30 and 90 days. No visitor count, conversion percentage or fabricated sample chart. Each daily chart bar has an accessible date/count label, and the same daily values are available in a details table.

The aggregate extension places traffic above the existing action strip. A daily page-view chart and page table are followed by native disclosure tables for separate source/device/browser/viewport/country and engagement/load breakdowns. Sources start expanded; other tables can be opened with the keyboard. Explain overlapping milestones, new-data start and incomplete capped days. Reuse existing tokens and table/empty/error patterns; no animation or additional panel system.
