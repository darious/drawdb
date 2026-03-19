import { chromium } from "playwright";

const baseUrl = process.env.DRAWDB_BASE_URL || "http://127.0.0.1:8015";

const yamlFixture = `version: 1
model:
  id: smoke_model
  name: Smoke Model
  database: generic
subject_areas:
  - Billing
  - ImportedOnly
tables:
  customer:
    id: tbl_customer
    name: Customer
    description: Customer master record
    subject_area: Billing
    tags:
      - pii
      - finance
    position:
      x: 120
      y: 100
    columns:
      id:
        id: fld_customer_id
        name: id
        type: int
        nullable: false
        primary_key: true
      supplier_id:
        id: fld_customer_supplier_id
        name: supplier_id
        type: int
  supplier:
    id: tbl_supplier
    name: Supplier
    description: Supplier directory
    subject_area: Operations
    tags:
      - vendor
    position:
      x: 520
      y: 100
    columns:
      id:
        id: fld_supplier_id
        name: id
        type: int
        nullable: false
        primary_key: true
relationships:
  - id: rel_customer_supplier
    from_table: customer
    from_column: supplier_id
    to_table: supplier
    to_column: id
    relationship_type: many_to_one
    name: customer_supplier_fk
`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getSelectPopup(page, selectLocator) {
  return page.locator(".semi-portal").last();
}

async function clickVisibleText(page, value) {
  return page.evaluate((targetText) => {
    const isVisible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        node.offsetParent !== null
      );
    };

    const exactMatch = [...document.querySelectorAll("*")].find((node) => {
      return isVisible(node) && node.textContent.trim() === targetText;
    });

    if (!exactMatch) return false;

    exactMatch.click();
    return true;
  }, value);
}

async function ensureDatabaseChosen(page) {
  const confirmButton = page.getByRole("button", { name: "Confirm" });
  if ((await confirmButton.count()) === 0) return;

  await page.getByText("Generic", { exact: true }).click({ force: true });
  await confirmButton.click({ force: true });
  await page.waitForTimeout(700);
}

async function openFileMenuPath(page, labels) {
  await page.getByText("File", { exact: true }).click({ force: true });
  for (let i = 0; i < labels.length - 1; i += 1) {
    await page.getByText(labels[i], { exact: true }).hover();
    await page.waitForTimeout(250);
  }
  await page.getByText(labels.at(-1), { exact: true }).click({ force: true });
}

async function importYaml(page, source) {
  await openFileMenuPath(page, ["Import from", "YAML"]);
  await page.waitForTimeout(500);
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "phase1-smoke.yml",
    mimeType: "text/yaml",
    buffer: Buffer.from(source),
  });
  await page.waitForTimeout(800);
  await page
    .locator(".semi-modal")
    .locator(".semi-button-primary")
    .last()
    .click({ force: true });
  await page.waitForTimeout(1200);
}

async function getVisibleSidebarTableNames(page) {
  return page.locator('[id^="scroll_table_"]').evaluateAll((nodes) =>
    nodes
      .filter((node) => node.offsetParent !== null)
      .map((node) => node.innerText.split("\n")[0].trim())
      .filter(Boolean),
  );
}

async function getCanvasTableCount(page) {
  return page
    .locator("foreignObject")
    .evaluateAll((nodes) =>
      nodes.filter((node) => node.getAttribute("width") !== "200").length,
    );
}

async function getRelationshipCount(page) {
  return page.locator("path.relationship-path").count();
}

async function openTablePanel(page, tableName) {
  const panel = page
    .locator('[id^="scroll_table_"]')
    .filter({ hasText: tableName })
    .first();
  await panel.click({ force: true });
  await page.waitForTimeout(300);
  return panel;
}

async function updateTableMetadata(page, tableName, { name, subjectArea, tags, comment }) {
  const panel = await openTablePanel(page, tableName);

  if (name !== undefined) {
    const nameInput = panel.locator('input[placeholder="Name"]').first();
    await nameInput.fill(name);
    await nameInput.blur();
  }

  if (subjectArea !== undefined) {
    const subjectAreaInput = panel
      .locator('input[placeholder="Subject area"], input[placeholder^="Known: "]')
      .first();
    await subjectAreaInput.fill(subjectArea);
    await subjectAreaInput.blur();
  }

  if (tags !== undefined) {
    const tagsInput = panel.getByPlaceholder("tag1, tag2").first();
    await tagsInput.fill(tags);
    await tagsInput.blur();
  }

  if (comment !== undefined) {
    await panel.getByText("Comment", { exact: true }).click({ force: true });
    await page.waitForTimeout(200);
    const textArea = panel.locator("textarea").first();
    await textArea.fill(comment);
    await textArea.blur();
  }

  await page.waitForTimeout(500);
}

async function getSubjectAreaOptions(page) {
  const filterSelect = page
    .locator(".semi-select")
    .filter({ hasText: "Subject area" })
    .first();
  const selection = filterSelect.locator(".semi-select-selection").first();
  if ((await selection.count()) > 0) {
    await selection.click({ force: true });
  } else {
    await filterSelect.click({ force: true });
  }
  await page.waitForTimeout(250);
  const popup = await getSelectPopup(page, filterSelect);
  const options = await popup
    .evaluate((node) =>
      [...new Set(node.innerText.split("\n").map((part) => part.trim()).filter(Boolean))],
    );
  await page.keyboard.press("Escape");
  return options;
}

async function selectSubjectAreaFilter(page, value, optionTexts) {
  const optionIndex = optionTexts.indexOf(value);
  if (optionIndex === -1) {
    throw new Error(
      `Could not find subject-area option '${value}'. Available options: ${JSON.stringify(optionTexts)}`,
    );
  }
  const filterSelect = page
    .locator(".semi-select")
    .filter({ hasText: "Subject area" })
    .first();
  const attempts = [optionIndex, optionIndex + 1, optionIndex + 2];

  for (const steps of attempts) {
    const selection = filterSelect.locator(".semi-select-selection").first();
    if ((await selection.count()) > 0) {
      await selection.click({ force: true });
    } else {
      await filterSelect.click({ force: true });
    }
    await page.waitForTimeout(250);
    for (let i = 0; i < steps; i += 1) {
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const currentText = await filterSelect.innerText();
    if (currentText.includes(value)) {
      await page.waitForTimeout(200);
      return;
    }
  }

  throw new Error(
    `Failed to select subject-area filter '${value}'. Options: ${JSON.stringify(optionTexts)}`,
  );
}

async function selectTagFilter(page, value, optionTexts) {
  const optionIndex = optionTexts.indexOf(value);
  if (optionIndex === -1) {
    throw new Error(
      `Could not find tag option '${value}'. Available options: ${JSON.stringify(optionTexts)}`,
    );
  }
  const filterSelect = page
    .locator(".semi-select")
    .filter({ hasText: "Tags" })
    .first();
  const attempts = [optionIndex + 1, optionIndex + 2, optionIndex];

  for (const steps of attempts) {
    const selection = filterSelect.locator(".semi-select-selection").first();
    if ((await selection.count()) > 0) {
      await selection.click({ force: true });
    } else {
      await filterSelect.click({ force: true });
    }
    await page.waitForTimeout(250);
    const clicked = await clickVisibleText(page, value);
    if (clicked) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const clickedText = await filterSelect.innerText();
      if (clickedText.includes(value)) {
        await page.waitForTimeout(200);
        return;
      }
    }
    for (let i = 0; i < steps; i += 1) {
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    const currentText = await filterSelect.innerText();
    if (currentText.includes(value)) {
      await page.waitForTimeout(200);
      return;
    }
  }

  throw new Error(
    `Failed to select tag filter '${value}'. Options: ${JSON.stringify(optionTexts)}`,
  );
}

async function clearFilters(page) {
  await page.getByRole("button", { name: "Clear filters" }).click({ force: true });
  await page.waitForTimeout(400);
}

async function exportYaml(page) {
  await openFileMenuPath(page, ["Export as", "YAML"]);
  const editor = page.locator(".monaco-editor").first();
  await editor.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(800);
  const scrollable = page.locator(".monaco-scrollable-element").first();
  const chunks = [];
  let previousChunk = null;

  for (let i = 0; i < 12; i += 1) {
    const chunk = (
      await page.locator(".view-line").evaluateAll((nodes) =>
        nodes.map((node) => node.textContent).join("\n"),
      )
    ).replace(/\u00a0/g, " ");

    if (chunk && chunk !== previousChunk) {
      chunks.push(chunk);
      previousChunk = chunk;
    }

    await scrollable.evaluate((node) => {
      node.scrollTop += 320;
    });
    await page.waitForTimeout(120);
  }

  const editorText = chunks.join("\n");
  if (editorText.trim()) {
    return editorText;
  }

  return (await page.locator("body").innerText()).replace(/\u00a0/g, " ");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    errors.push(`pageerror:${err.message}`);
  });

  await page.goto(`${baseUrl}/editor/templates/blank`, {
    waitUntil: "load",
    timeout: 30000,
  });
  await page.waitForTimeout(1200);

  await ensureDatabaseChosen(page);
  await importYaml(page, yamlFixture);

  const importedTableNames = await getVisibleSidebarTableNames(page);
  assert(
    importedTableNames.includes("Customer") &&
      importedTableNames.includes("Supplier"),
    `Expected imported tables Customer and Supplier, got ${JSON.stringify(importedTableNames)}`,
  );
  assert(
    (await getCanvasTableCount(page)) === 2,
    "Expected two visible canvas tables after YAML import.",
  );
  assert(
    (await getRelationshipCount(page)) === 1,
    "Expected one visible relationship after YAML import.",
  );

  const subjectAreaOptionsBeforeEdit = await getSubjectAreaOptions(page);
  assert(
    subjectAreaOptionsBeforeEdit.includes("ImportedOnly"),
    `Expected ImportedOnly in subject-area options, got ${JSON.stringify(subjectAreaOptionsBeforeEdit)}`,
  );
  assert(
    subjectAreaOptionsBeforeEdit.includes("Operations"),
    `Expected Operations in subject-area options, got ${JSON.stringify(subjectAreaOptionsBeforeEdit)}`,
  );

  await updateTableMetadata(page, "Supplier", {
    name: "Supplier Directory",
    subjectArea: "Field Ops",
    tags: "Vendor, Partners",
    comment: "Directory for approved suppliers",
  });

  const supplierPanel = await openTablePanel(page, "Supplier Directory");
  const normalizedTags = await supplierPanel.getByPlaceholder("tag1, tag2").inputValue();
  assert(
    normalizedTags === "vendor, partners",
    `Expected normalized tags 'vendor, partners', got '${normalizedTags}'`,
  );

  const subjectAreaOptionsAfterEdit = await getSubjectAreaOptions(page);
  assert(
    subjectAreaOptionsAfterEdit.includes("Field Ops"),
    `Expected edited subject area in filter options, got ${JSON.stringify(subjectAreaOptionsAfterEdit)}`,
  );
  const expectedTagOptions = ["finance", "partners", "pii", "vendor"];

  await selectSubjectAreaFilter(page, "Billing", subjectAreaOptionsAfterEdit);
  const subjectAreaFilteredNames = await getVisibleSidebarTableNames(page);
  assert(
    JSON.stringify(subjectAreaFilteredNames) === JSON.stringify(["Customer"]),
    `Subject-area filter did not reduce the sidebar table list to Customer. Got ${JSON.stringify(subjectAreaFilteredNames)}`,
  );
  assert(
    (await getCanvasTableCount(page)) === 1,
    "Subject-area filter did not reduce visible canvas tables to one.",
  );
  assert(
    (await getRelationshipCount(page)) === 0,
    "Relationship should be hidden when one endpoint table is filtered out.",
  );

  await clearFilters(page);

  await selectTagFilter(page, "partners", expectedTagOptions);
  const tagFilteredNames = await getVisibleSidebarTableNames(page);
  assert(
    JSON.stringify(tagFilteredNames) === JSON.stringify(["Supplier Directory"]),
    `Tag filter did not reduce the sidebar table list to Supplier Directory. Got ${JSON.stringify(tagFilteredNames)}`,
  );
  assert(
    (await getCanvasTableCount(page)) === 1,
    "Tag filter did not reduce visible canvas tables to one.",
  );
  assert(
    (await getRelationshipCount(page)) === 0,
    "Relationship should be hidden under tag filtering when one endpoint is filtered out.",
  );

  await clearFilters(page);

  const exportedView = await exportYaml(page);
  assert(
    exportedView.includes("subject_areas:"),
    `Exported YAML modal did not render subject_areas. Output: ${exportedView.slice(0, 2000)}`,
  );
  assert(
    exportedView.includes("ImportedOnly"),
    `Exported YAML did not preserve imported-only subject areas. Output: ${exportedView.slice(0, 2000)}`,
  );
  assert(
    exportedView.includes("Field Ops"),
    `Exported YAML did not include the edited subject area. Output: ${exportedView.slice(0, 2000)}`,
  );
  assert(
    exportedView.includes("vendor") && exportedView.includes("partners"),
    `Exported YAML did not include normalized tags. Output: ${exportedView.slice(0, 2000)}`,
  );
  assert(
    exportedView.includes("Directory for approved suppliers"),
    `Exported YAML did not include the updated description/comment. Output: ${exportedView.slice(0, 2000)}`,
  );
  assert(
    exportedView.includes("Supplier Directory"),
    `Exported YAML did not include the renamed table. Output: ${exportedView.slice(0, 2000)}`,
  );

  const blockingErrors = errors.filter(
    (error) =>
      !error.includes("Invalid DOM property") &&
      !error.includes("findDOMNode is deprecated"),
  );
  if (blockingErrors.length > 0) {
    throw new Error(blockingErrors.join("\n"));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        importedTableNames,
        subjectAreaOptionsBeforeEdit,
        subjectAreaOptionsAfterEdit,
        normalizedTags,
      },
      null,
      2,
    ),
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
