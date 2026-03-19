import { useMemo, useState } from "react";
import { Row, Col, Select, Button, Popover, Table, Input } from "@douyinfe/semi-ui";
import {
  IconDeleteStroked,
  IconLoopTextStroked,
  IconMore,
  IconPlus,
} from "@douyinfe/semi-icons";
import {
  Cardinality,
  Constraint,
  Action,
  ObjectType,
} from "../../../data/constants";
import { useDiagram, useLayout, useUndoRedo } from "../../../hooks";
import i18n from "../../../i18n/i18n";
import { useTranslation } from "react-i18next";
import {
  getPrimaryRelationshipPair,
  getRelationshipFieldNames,
  getRelationshipPairs,
} from "../../../utils/relationships";

const columns = [
  {
    title: i18n.t("primary"),
    dataIndex: "primary",
  },
  {
    title: i18n.t("foreign"),
    dataIndex: "foreign",
  },
];

export default function RelationshipInfo({ data }) {
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { tables, deleteRelationship, updateRelationship } = useDiagram();
  const { t } = useTranslation();
  const { layout } = useLayout();
  const [editField, setEditField] = useState({});

  const relValues = useMemo(
    () => getRelationshipFieldNames(data, tables),
    [tables, data],
  );
  const startTable = tables.find((table) => table.id === data.startTableId);
  const endTable = tables.find((table) => table.id === data.endTableId);
  const primaryPair = getPrimaryRelationshipPair(data);

  const pushRelationshipUndo = (redo, extra, undo = data) => {
    setUndoStack((prev) => [
      ...prev,
      {
        action: Action.EDIT,
        element: ObjectType.RELATIONSHIP,
        rid: data.id,
        undo,
        redo,
        message: t("edit_relationship", {
          refName: data.name,
          extra,
        }),
      },
    ]);
    setRedoStack([]);
  };

  const swapKeys = () => {
    const swappedPairs = getRelationshipPairs(data).map((pair) => ({
      startFieldId: pair.endFieldId,
      endFieldId: pair.startFieldId,
    }));
    const swappedPrimary = swappedPairs[0];
    const nextName =
      relValues?.primaryPair && relValues?.startTable && relValues?.endTable
        ? `fk_${relValues.endTable.name}_${relValues.primaryPair.endFieldName}_${relValues.startTable.name}`
        : data.name;

    pushRelationshipUndo(
      {
        startTableId: data.endTableId,
        startFieldId: swappedPrimary?.startFieldId,
        endTableId: data.startTableId,
        endFieldId: swappedPrimary?.endFieldId,
        columnPairs: swappedPairs,
        name: nextName,
      },
      "[swap keys]",
    );

    updateRelationship(data.id, {
      name: nextName,
      startTableId: data.endTableId,
      startFieldId: swappedPrimary?.startFieldId,
      endTableId: data.startTableId,
      endFieldId: swappedPrimary?.endFieldId,
      columnPairs: swappedPairs,
    });
  };

  const updateColumnPairs = (columnPairs) => {
    const nextPrimary = columnPairs[0];
    updateRelationship(data.id, {
      columnPairs,
      startFieldId: nextPrimary?.startFieldId,
      endFieldId: nextPrimary?.endFieldId,
    });
  };

  const changePair = (index, key, value) => {
    if (layout.readOnly) return;

    const nextPairs = getRelationshipPairs(data).map((pair, pairIndex) =>
      pairIndex === index ? { ...pair, [key]: value } : pair,
    );
    pushRelationshipUndo(
      {
        columnPairs: nextPairs,
        startFieldId: nextPairs[0]?.startFieldId,
        endFieldId: nextPairs[0]?.endFieldId,
      },
      "[column pairs]",
      {
        columnPairs: getRelationshipPairs(data),
        startFieldId: data.startFieldId,
        endFieldId: data.endFieldId,
      },
    );
    updateColumnPairs(nextPairs);
  };

  const addPair = () => {
    if (layout.readOnly || !startTable?.fields?.length || !endTable?.fields?.length) return;

    const nextPairs = [
      ...getRelationshipPairs(data),
      {
        startFieldId: startTable.fields[0].id,
        endFieldId: endTable.fields[0].id,
      },
    ];
    pushRelationshipUndo(
      {
        columnPairs: nextPairs,
        startFieldId: nextPairs[0]?.startFieldId,
        endFieldId: nextPairs[0]?.endFieldId,
      },
      "[add column pair]",
      {
        columnPairs: getRelationshipPairs(data),
        startFieldId: data.startFieldId,
        endFieldId: data.endFieldId,
      },
    );
    updateColumnPairs(nextPairs);
  };

  const removePair = (index) => {
    if (layout.readOnly) return;

    const previousPairs = getRelationshipPairs(data);
    if (previousPairs.length <= 1) return;

    const nextPairs = previousPairs.filter((_, pairIndex) => pairIndex !== index);
    pushRelationshipUndo(
      {
        columnPairs: nextPairs,
        startFieldId: nextPairs[0]?.startFieldId,
        endFieldId: nextPairs[0]?.endFieldId,
      },
      "[remove column pair]",
      {
        columnPairs: previousPairs,
        startFieldId: data.startFieldId,
        endFieldId: data.endFieldId,
      },
    );
    updateColumnPairs(nextPairs);
  };

  const changeCardinality = (value) => {
    if (layout.readOnly) return;

    pushRelationshipUndo({ cardinality: value }, "[cardinality]", {
      cardinality: data.cardinality,
    });
    updateRelationship(data.id, { cardinality: value });
  };

  const changeConstraint = (key, value) => {
    if (layout.readOnly) return;

    const constraintKey = `${key}Constraint`;
    pushRelationshipUndo({ [constraintKey]: value }, "[constraint]", {
      [constraintKey]: data[constraintKey],
    });
    updateRelationship(data.id, { [constraintKey]: value });
  };

  return (
    <>
      <div className="flex items-center mb-2.5">
        <div className="text-md font-semibold break-keep">{t("name")}: </div>
        <Input
          value={data.name}
          validateStatus={data.name.trim() === "" ? "error" : "default"}
          placeholder={t("name")}
          className="ms-2"
          readonly={layout.readOnly}
          onChange={(value) => updateRelationship(data.id, { name: value })}
          onFocus={(e) => setEditField({ name: e.target.value })}
          onBlur={(e) => {
            if (e.target.value === editField.name) return;
            pushRelationshipUndo({ name: e.target.value }, "[name]", editField);
          }}
        />
      </div>
      <div className="flex justify-between items-center mb-3">
        <div className="me-3">
          <span className="font-semibold">{t("primary")}: </span>
          {relValues?.endTable.name}
        </div>
        <div className="mx-1">
          <span className="font-semibold">{t("foreign")}: </span>
          {relValues?.startTable.name}
        </div>
        <div className="ms-1">
          <Popover
            content={
              <div className="p-2 popover-theme">
                <Table
                  columns={columns}
                  dataSource={(relValues?.pairs ?? []).map((pair, index) => ({
                    key: `${index}`,
                    foreign: `${relValues.startTable.name}(${pair.startFieldName})`,
                    primary: `${relValues.endTable.name}(${pair.endFieldName})`,
                  }))}
                  pagination={false}
                  size="small"
                  bordered
                />
                <div className="mt-2">
                  <Button
                    block
                    icon={<IconLoopTextStroked />}
                    onClick={swapKeys}
                    disabled={layout.readOnly}
                  >
                    {t("swap")}
                  </Button>
                </div>
              </div>
            }
            trigger="click"
            position="rightTop"
            showArrow
          >
            <Button icon={<IconMore />} type="tertiary" />
          </Popover>
        </div>
      </div>

      <div className="font-semibold my-1">Column pairs:</div>
      <div className="space-y-2 mb-3">
        {getRelationshipPairs(data).map((pair, index) => (
          <div key={`${data.id}_pair_${index}`} className="flex gap-2 items-end">
            <div className="grow">
              <div className="text-sm font-semibold mb-1">{t("foreign")}:</div>
              <Select
                value={pair.startFieldId}
                disabled={layout.readOnly}
                optionList={(startTable?.fields ?? []).map((field) => ({
                  label: field.name,
                  value: field.id,
                }))}
                onChange={(value) => changePair(index, "startFieldId", value)}
              />
            </div>
            <div className="grow">
              <div className="text-sm font-semibold mb-1">{t("primary")}:</div>
              <Select
                value={pair.endFieldId}
                disabled={layout.readOnly}
                optionList={(endTable?.fields ?? []).map((field) => ({
                  label: field.name,
                  value: field.id,
                }))}
                onChange={(value) => changePair(index, "endFieldId", value)}
              />
            </div>
            <Button
              type="danger"
              theme="borderless"
              icon={<IconDeleteStroked />}
              disabled={layout.readOnly || getRelationshipPairs(data).length <= 1}
              onClick={() => removePair(index)}
            />
          </div>
        ))}
        <Button
          icon={<IconPlus />}
          disabled={layout.readOnly || !primaryPair}
          onClick={addPair}
        >
          Add pair
        </Button>
      </div>

      <div className="font-semibold my-1">{t("cardinality")}:</div>
      <Select
        optionList={Object.values(Cardinality).map((v) => ({
          label: t(v),
          value: v,
        }))}
        value={data.cardinality}
        className="w-full"
        onChange={changeCardinality}
      />

      {data.cardinality !== Cardinality.ONE_TO_ONE && (
        <>
          <div className="text-md font-semibold break-keep mt-2">
            {t("many_side_label")}:
          </div>
          <Input
            value={data.manyLabel}
            placeholder={t("label")}
            onChange={(value) => updateRelationship(data.id, { manyLabel: value })}
            onFocus={(e) => setEditField({ manyLabel: e.target.value })}
            readonly={layout.readOnly}
            onBlur={(e) => {
              if (e.target.value === editField.manyLabel) return;
              pushRelationshipUndo(
                { manyLabel: e.target.value },
                "[manyLabel]",
                editField,
              );
            }}
          />
        </>
      )}

      <Row gutter={6} className="my-3">
        <Col span={12}>
          <div className="font-semibold">{t("on_update")}: </div>
          <Select
            optionList={Object.values(Constraint).map((v) => ({
              label: v,
              value: v,
            }))}
            value={data.updateConstraint}
            className="w-full"
            onChange={(value) => changeConstraint("update", value)}
          />
        </Col>
        <Col span={12}>
          <div className="font-semibold">{t("on_delete")}: </div>
          <Select
            optionList={Object.values(Constraint).map((v) => ({
              label: v,
              value: v,
            }))}
            value={data.deleteConstraint}
            className="w-full"
            onChange={(value) => changeConstraint("delete", value)}
          />
        </Col>
      </Row>
      <Button
        block
        type="danger"
        disabled={layout.readOnly}
        icon={<IconDeleteStroked />}
        onClick={() => deleteRelationship(data.id)}
      >
        {t("delete")}
      </Button>
    </>
  );
}
