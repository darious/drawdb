import { Collapse, Button, Select } from "@douyinfe/semi-ui";
import { IconEyeOpened, IconEyeClosed } from "@douyinfe/semi-icons";
import { IconPlus } from "@douyinfe/semi-icons";
import {
  useSelect,
  useDiagram,
  useMetadata,
  useSaveState,
  useLayout,
  useUndoRedo,
} from "../../../hooks";
import { Action, ObjectType, State } from "../../../data/constants";
import { useTranslation } from "react-i18next";
import { DragHandle } from "../../SortableList/DragHandle";
import { SortableList } from "../../SortableList/SortableList";
import SearchBar from "./SearchBar";
import Empty from "../Empty";
import TableInfo from "./TableInfo";
import { deriveKnownTags, matchesMetadataFilters } from "../../../utils/tableMetadata";

export default function TablesTab() {
  const { tables, addTable, setTables } = useDiagram();
  const { filters, setFilters, clearFilters, knownSubjectAreas } = useMetadata();
  const { selectedElement, setSelectedElement } = useSelect();
  const { t } = useTranslation();
  const { layout } = useLayout();
  const { setSaveState } = useSaveState();
  const knownTags = deriveKnownTags(tables);
  const filteredTables = tables.filter((table) =>
    matchesMetadataFilters(table, filters),
  );
  const hasActiveFilters =
    filters.selectedSubjectArea !== "All" || filters.selectedTags.length > 0;

  return (
    <>
      <div className="space-y-2 mb-2">
        <Select
          value={filters.selectedSubjectArea}
          optionList={[
            { label: "All", value: "All" },
            ...knownSubjectAreas.map((subjectArea) => ({
              label: subjectArea,
              value: subjectArea,
            })),
          ]}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, selectedSubjectArea: value }))
          }
          insetLabel="Subject area"
        />
        <Select
          multiple
          value={filters.selectedTags}
          optionList={knownTags.map((tag) => ({ label: tag, value: tag }))}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, selectedTags: value }))
          }
          insetLabel="Tags"
          placeholder="Filter by tags"
        />
        <Button
          theme="borderless"
          type="tertiary"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </Button>
      </div>
      <div className="flex gap-2">
        <SearchBar tables={filteredTables} />
        <div>
          <Button
            block
            icon={<IconPlus />}
            onClick={() => addTable()}
            disabled={layout.readOnly}
          >
            {t("add_table")}
          </Button>
        </div>
      </div>
      {tables.length === 0 ? (
        <Empty title={t("no_tables")} text={t("no_tables_text")} />
      ) : filteredTables.length === 0 ? (
        <Empty
          title="No matching tables"
          text="No tables match current filters."
        />
      ) : hasActiveFilters ? (
        <Collapse
          activeKey={
            selectedElement.open && selectedElement.element === ObjectType.TABLE
              ? `${selectedElement.id}`
              : ""
          }
          keepDOM={false}
          lazyRender
          onChange={(k) =>
            setSelectedElement((prev) => ({
              ...prev,
              open: true,
              id: k[0],
              element: ObjectType.TABLE,
            }))
          }
          accordion
        >
          {filteredTables.map((table) => (
            <TableListItem key={table.id} table={table} />
          ))}
        </Collapse>
      ) : (
        <Collapse
          activeKey={
            selectedElement.open && selectedElement.element === ObjectType.TABLE
              ? `${selectedElement.id}`
              : ""
          }
          keepDOM={false}
          lazyRender
          onChange={(k) =>
            setSelectedElement((prev) => ({
              ...prev,
              open: true,
              id: k[0],
              element: ObjectType.TABLE,
            }))
          }
          accordion
        >
          <SortableList
            keyPrefix="tables-tab"
            items={filteredTables}
            onChange={(newTables) => setTables(newTables)}
            afterChange={() => setSaveState(State.SAVING)}
            renderItem={(item) => <TableListItem table={item} />}
          />
        </Collapse>
      )}
    </>
  );
}

function TableListItem({ table }) {
  const { layout } = useLayout();
  const { updateTable } = useDiagram();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { t } = useTranslation();

  const toggleTableVisibility = (e) => {
    e.stopPropagation();
    setUndoStack((prev) => [
      ...prev,
      {
        action: Action.EDIT,
        element: ObjectType.TABLE,
        component: "self",
        tid: table.id,
        undo: { hidden: table.hidden },
        redo: { hidden: !table.hidden },
        message: t("edit_table", {
          tableName: table.name,
          extra: "[hidden]",
        }),
      },
    ]);
    setRedoStack([]);
    updateTable(table.id, { hidden: !table.hidden });
  };

  return (
    <div id={`scroll_table_${table.id}`}>
      <Collapse.Panel
        className="relative"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1">
              <DragHandle readOnly={layout.readOnly} id={table.id} />
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                {table.name}
              </div>
            </div>
            <Button
              size="small"
              theme="borderless"
              type="tertiary"
              onClick={toggleTableVisibility}
              icon={table.hidden ? <IconEyeClosed /> : <IconEyeOpened />}
              className="me-2"
            />
            <div
              className="w-1 h-full absolute top-0 left-0 bottom-0"
              style={{ backgroundColor: table.color }}
            />
          </div>
        }
        itemKey={`${table.id}`}
      >
        <TableInfo data={table} />
      </Collapse.Panel>
    </div>
  );
}
