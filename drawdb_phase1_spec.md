# Phase 1 Spec — DrawDB-based YAML-backed ERD Modeller

## 1. Purpose

Phase 1 delivers a **simple but usable internal modelling tool** by extending a fork of **DrawDB**.

The purpose of this phase is to prove that the following approach works:

- start from an existing **visual ERD editor**
- add lightweight modelling metadata
- support **YAML import/export**
- support **filtering**
- keep the existing visual editing experience intact

This phase is intentionally narrow. It is not trying to become a full enterprise data modelling platform.

---

## 2. Objectives

Phase 1 must deliver a tool that allows a user to:

- create and edit tables, columns, and relationships visually
- add **tags** to tables
- assign a **subject area** to tables
- filter the canvas by **subject area**
- filter the canvas by **tag**
- export the current model to **YAML**
- import a model from **YAML**
- continue using existing DrawDB SQL export functionality

---

## 3. Non-goals

The following are explicitly out of scope for Phase 1:

- Git integration
- model versioning UI
- named saved views
- logical vs physical model separation
- multi-target database support
- attribute-level tags
- governance workflows
- approval workflows
- collaboration features
- model diff/merge UI
- code editor pane
- multi-file model storage
- YAML as the live runtime editor model

---

## 4. Success criteria

Phase 1 is successful if:

1. DrawDB still works as a visual editor.
2. Tables can store and edit:
   - description
   - tags
   - subject area
3. Models can be exported to YAML.
4. YAML models can be imported back successfully.
5. Round-tripping preserves:
   - tables
   - columns
   - relationships
   - positions
   - descriptions
   - tags
   - subject areas
6. Users can filter by subject area.
7. Users can filter by one or more tags.
8. Existing SQL export still works.
9. Invalid YAML fails safely with clear errors.
10. Changes remain modular enough that future upstream updates are still realistic.

---

## 5. Product scope

### In scope

- fork DrawDB
- define a **v1 canonical YAML schema**
- add YAML import
- add YAML export
- add table description
- add table tags
- add single subject-area assignment per table
- add filter UI
- add tag filtering
- add subject-area filtering
- basic validation
- preserve existing visual editing behaviour

### Out of scope

Everything listed in section 3.

---

## 6. User stories

### 6.1 Create a model visually
As a user, I can create tables, columns, and relationships on the canvas.

### 6.2 Edit table metadata
As a user, I can edit:
- table description
- table tags
- table subject area

### 6.3 Export YAML
As a user, I can export the current model to a YAML file.

### 6.4 Import YAML
As a user, I can import a YAML file and render it as a visual model.

### 6.5 Filter by subject area
As a user, I can show only tables belonging to a selected subject area.

### 6.6 Filter by tag
As a user, I can show only tables matching one or more selected tags.

### 6.7 Clear filters
As a user, I can clear all filters and return to the full model.

---

## 7. Functional requirements

## 7.1 Visual editing

The existing DrawDB visual editing experience remains the primary editing surface.

Users must still be able to:
- create tables
- edit columns
- create relationships
- move tables on the canvas
- export SQL using existing functionality

No regression in core editing behaviour is acceptable.

---

## 7.2 Table metadata

Each table must support the following new metadata fields:

- `description`
- `tags`
- `subject_area`

### Description
Free-text description of the table.

### Tags
A list of zero or more tag strings.

Rules:
- tags are stored as strings
- tags are trimmed
- tags are lower-case on save
- duplicate tags are removed on save

### Subject area
A table can have zero or one subject area in Phase 1.

Rules:
- subject area is a simple string
- subject areas are managed at model level as known values
- if a table references a subject area not already in the model list, it is auto-added during import/save

---

## 7.3 Column metadata

Phase 1 keeps column metadata minimal.

Each column supports:
- name
- type
- nullable
- primary key

No column-level tags or descriptions in Phase 1.

---

## 7.4 Relationship metadata

Relationships continue to use DrawDB’s existing model, with the addition of stable IDs in YAML export/import.

Phase 1 does not add richer relationship semantics.

---

## 7.5 Filtering

### Filter controls
The UI must provide:

- **Subject area filter**
  - single select
  - default value: `All`

- **Tag filter**
  - multi-select or token-based selection
  - default value: no tags selected

- **Clear filters** action

### Subject area filtering behaviour
When a subject area is selected:
- show only tables whose `subject_area` equals the selected value
- hide all others

### Tag filtering behaviour
When one or more tags are selected:
- show tables matching **any** selected tag

This is OR matching for Phase 1.

Example:
- selected tags: `pii`, `finance`
- visible tables: tables tagged `pii` or `finance` or both

### Combined filtering behaviour
If both subject area and tags are active:
- table must match the selected subject area
- and must match at least one selected tag

### Relationship behaviour under filtering
Relationships are only visible if **both connected tables are visible**.

### Empty result behaviour
If no tables match:
- show empty canvas state
- show message: `No tables match current filters`

### Filter persistence
Filters are UI session state only in Phase 1.

They are **not** saved into YAML.

---

## 7.6 YAML import/export

## Export YAML
The application must support exporting the current model to a canonical YAML format.

Requirements:
- deterministic ordering
- pretty-printed output
- includes positions
- includes tags
- includes subject areas
- includes descriptions
- includes stable IDs

## Import YAML
The application must support importing a YAML model.

Requirements:
- parse YAML
- validate required fields
- map YAML model into DrawDB runtime model
- render successfully on the canvas
- preserve metadata where supported

## Import failure behaviour
If YAML is invalid:
- show clear validation error
- keep current model unchanged
- do not partially apply a broken import

---

## 8. Canonical YAML schema v1

Phase 1 uses a **single-file YAML format**.

Example:

```yaml
version: 1

model:
  id: customer_billing
  name: Customer Billing
  description: Customer and contract domain model

subject_areas:
  - customer
  - billing
  - metering

tables:
  customer:
    id: tbl_customer
    name: customer
    description: Customer master entity
    subject_area: customer
    tags: [master, pii]
    position:
      x: 120
      y: 80
    columns:
      customer_id:
        id: col_customer_customer_id
        name: customer_id
        type: string
        nullable: false
        primary_key: true
      first_name:
        id: col_customer_first_name
        name: first_name
        type: string
        nullable: true
      last_name:
        id: col_customer_last_name
        name: last_name
        type: string
        nullable: true

  contract:
    id: tbl_contract
    name: contract
    description: Commercial contract
    subject_area: billing
    tags: [finance]
    position:
      x: 520
      y: 120
    columns:
      contract_id:
        id: col_contract_contract_id
        name: contract_id
        type: string
        nullable: false
        primary_key: true
      customer_id:
        id: col_contract_customer_id
        name: customer_id
        type: string
        nullable: false
      start_date:
        id: col_contract_start_date
        name: start_date
        type: date
        nullable: true

relationships:
  - id: rel_contract_customer
    from_table: contract
    from_column: customer_id
    to_table: customer
    to_column: customer_id
    relationship_type: many_to_one
```

---

## 9. YAML schema rules

### Model
- `version` is required
- `model.id` is required
- `model.name` is required
- `model.description` is optional

### Subject areas
- `subject_areas` is a list of strings
- values must be unique after normalisation

### Tables
- table keys must be unique
- `id` and `name` are required
- `description` optional
- `subject_area` optional
- `tags` optional
- `position` required for canvas placement
- `columns` required

### Columns
- column keys must be unique within a table
- `id`, `name`, and `type` are required
- `nullable` defaults to true if omitted
- `primary_key` defaults to false if omitted

### Relationships
- relationship IDs must be unique
- referenced tables must exist
- referenced columns must exist

---

## 10. UI requirements

## 10.1 Table metadata editor
A table properties panel must include:

- table name
- description
- subject area
- tags

Suggested controls:
- description: textarea
- subject area: dropdown or editable combo box
- tags: token input or comma-separated input

This should sit in the existing properties/edit panel if possible.

---

## 10.2 Model settings
A model-level settings panel or modal must support:

- model name
- model description
- known subject areas

This can be simple in Phase 1.

---

## 10.3 Filter UI
A filter bar or filter side panel must provide:

- `Subject area` selector
- `Tags` selector
- `Clear filters` button

The filter controls must update the visible canvas immediately.

---

## 11. Technical design

## 11.1 Core principle

For Phase 1:

- **DrawDB runtime model remains the live editor model**
- **YAML is an import/export format**
- **new metadata is mapped into DrawDB runtime objects**

This avoids rewriting the application architecture too early.

---

## 11.2 Required internal layers

A clean separation must be introduced between:

1. **DrawDB runtime/editor state**
2. **Canonical YAML model**
3. **Mapping layer**
4. **Validation layer**

Architecture shape:

```text
DrawDB editor state
    <-> model mapper
Canonical YAML model
```

---

## 11.3 Suggested module structure

```text
src/
  lib/
    model/
      yaml-schema.ts
      yaml-import.ts
      yaml-export.ts
      model-mapper.ts
      validation.ts
    features/
      table-metadata/
        metadata-panel.ts
        tag-input.ts
        subject-area-select.ts
      filtering/
        filter-store.ts
        filter-bar.ts
        apply-filters.ts
```

This is illustrative only. Exact filenames may differ.

---

## 11.4 Mapping responsibilities

### DrawDB -> YAML
Must map:
- model metadata
- tables
- columns
- relationships
- tags
- subject area
- positions
- descriptions

### YAML -> DrawDB
Must reconstruct:
- visual tables
- columns
- relationships
- positions
- tags
- subject area
- descriptions

---

## 12. Validation requirements

Validation must run on import and ideally before export.

Minimum validation rules:

- duplicate table names not allowed
- duplicate column names within a table not allowed
- duplicate relationship IDs not allowed
- broken table references not allowed
- broken column references not allowed
- malformed tags normalised or rejected
- missing required fields rejected
- invalid YAML rejected with readable messages

Import must fail safely and atomically.

---

## 13. Data behaviour rules

## 13.1 IDs
Stable IDs are required for:
- tables
- columns
- relationships

IDs must be preserved on round-trip.

## 13.2 Ordering
Exported YAML must be deterministic.

Suggested ordering:
- model metadata first
- subject areas alphabetically
- tables alphabetically by key/name
- columns in display order
- relationships in stable order

## 13.3 String normalisation
- tags lower-cased
- tags trimmed
- subject areas trimmed
- empty tags removed

---

## 14. Acceptance criteria

Phase 1 is complete when all of the following are true:

1. User can create and edit a model visually in the DrawDB fork.
2. User can set description, tags, and subject area on each table.
3. User can export the model to YAML.
4. User can import exported YAML back into a fresh session.
5. Round-trip preserves:
   - tables
   - columns
   - relationships
   - positions
   - descriptions
   - tags
   - subject areas
6. User can filter visible tables by subject area.
7. User can filter visible tables by one or more tags.
8. Combined filters work correctly.
9. Only relationships between visible tables are shown when filtering.
10. Clearing filters restores the full model.
11. SQL export still works.
12. Invalid YAML produces a readable validation error and does not corrupt current state.

---

## 15. Implementation order

Recommended order of work:

### Step 1
Fork DrawDB and get local build/dev environment working.

### Step 2
Inspect and understand the internal document/runtime model.

### Step 3
Add support for table metadata in runtime state:
- description
- tags
- subject area

### Step 4
Expose table metadata in the UI.

### Step 5
Add filter state and filtering UI.

### Step 6
Implement filter application on the canvas.

### Step 7
Define canonical YAML v1 schema.

### Step 8
Implement YAML exporter.

### Step 9
Implement YAML importer.

### Step 10
Implement validation and error handling.

### Step 11
Test round-tripping and filtered behaviour on several sample models.

---

## 16. Risks

### 16.1 DrawDB internal model coupling
If DrawDB’s internal model is too tightly coupled to its current JSON shape, mapping may be awkward.

### 16.2 Noisy YAML output
Without stable ordering and ID handling, Git diffs will become messy later.

### 16.3 UI clutter
Poor placement of metadata and filter controls could make the UI feel bolted on.

### 16.4 Hidden future rewrite
If Phase 1 leaks YAML semantics directly into random parts of the app, later phases will become harder.

---

## 17. Design constraints

Phase 1 must avoid:

- introducing multiple conflicting sources of truth
- making filter state part of model persistence
- adding governance complexity too early
- building saved views before simple filters exist
- forcing a full architectural rewrite

---

## 18. Deferred items for later phases

These are valid future enhancements, but not part of Phase 1:

- saved named views
- per-view layout
- logical vs physical model split
- multiple subject areas per table
- column-level tags
- owner/steward metadata
- layer/source/status metadata
- Git-aware file save strategy
- multi-file model storage
- DBML/Mermaid export
- import from other formats
- raw YAML/code editor pane

---

## 19. Summary

Phase 1 should produce:

- a **working DrawDB fork**
- with **table metadata**
- **filtering by subject area and tag**
- **YAML import/export**
- and no major breakage to existing visual editing

That is enough to prove the core idea without overbuilding.
