"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ButtonColor, ButtonType } from "@/lib/supabase/types";
import {
  createButtonAction,
  deleteButtonAction,
  reorderButtonsAction,
  updateButtonAction,
} from "./actions";

type ButtonRow = {
  id: string;
  label: string;
  color: ButtonColor;
  type: ButtonType;
  sort_order: number;
};

const COLOR_OPTIONS: { value: ButtonColor; className: string }[] = [
  { value: "red", className: "bg-red-500" },
  { value: "orange", className: "bg-orange-500" },
  { value: "amber", className: "bg-amber-500" },
  { value: "green", className: "bg-green-500" },
  { value: "teal", className: "bg-teal-500" },
  { value: "blue", className: "bg-blue-500" },
  { value: "purple", className: "bg-purple-500" },
  { value: "gray", className: "bg-gray-500" },
];

const COLOR_CLASS: Record<ButtonColor, string> = Object.fromEntries(
  COLOR_OPTIONS.map((c) => [c.value, c.className])
) as Record<ButtonColor, string>;

function ButtonForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: ButtonRow;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState<ButtonColor>(initial?.color ?? "red");
  const [type, setType] = useState<ButtonType>(initial?.type ?? "marker");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.set("label", label);
        formData.set("color", color);
        formData.set("type", type);
        onSubmit(formData);
      }}
      className="flex flex-col gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-3"
    >
      <input
        autoFocus
        required
        placeholder="Button label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-label={c.value}
            onClick={() => setColor(c.value)}
            className={`h-9 w-9 rounded-full ${c.className} ${
              color === c.value ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-white" : ""
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        {(["marker", "segment"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
              type === t
                ? "bg-red-500 text-white"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-neutral-700 px-3 py-3 text-sm text-neutral-300 hover:border-neutral-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-red-500 px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {pending ? "Saving..." : initial ? "Save changes" : "Add button"}
        </button>
      </div>
    </form>
  );
}

function SortableButtonRow({
  button,
  editing,
  pending,
  busy,
  onEdit,
  onDelete,
  onUpdate,
  onCancelEdit,
}: {
  button: ButtonRow;
  editing: boolean;
  pending: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (formData: FormData) => void;
  onCancelEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: button.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (editing) {
    return (
      <li ref={setNodeRef} style={style}>
        <ButtonForm
          initial={button}
          pending={pending}
          onSubmit={onUpdate}
          onCancel={onCancelEdit}
        />
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="shrink-0 touch-none px-1 py-2 text-neutral-500 hover:text-neutral-300"
        >
          ⠿
        </button>
        <span className={`h-6 w-6 shrink-0 rounded-full ${COLOR_CLASS[button.color]}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{button.label}</p>
          <p className="text-xs capitalize text-neutral-500">{button.type}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-neutral-400 hover:text-foreground"
          >
            Edit
          </button>
          <button
            disabled={busy}
            onClick={onDelete}
            className="rounded-lg p-2 text-red-400 hover:text-red-300 disabled:opacity-30"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

export function ButtonGridEditor({
  showId,
  initialButtons,
}: {
  showId: string;
  initialButtons: ButtonRow[];
}) {
  const [buttons, setButtons] = useState(initialButtons);
  // Re-sync local order from the server-confirmed prop whenever it changes
  // for a reason other than our own optimistic reorder below (e.g. after
  // add/edit/delete revalidate). Doing this during render — not in an
  // effect — is React's documented pattern for this, and avoids the
  // drag-drop flicker an effect-based sync would cause.
  const [syncedFrom, setSyncedFrom] = useState(initialButtons);
  if (initialButtons !== syncedFrom) {
    setSyncedFrom(initialButtons);
    setButtons(initialButtons);
  }

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasSegmentButton = buttons.some((b) => b.type === "segment");

  async function handleCreate(formData: FormData) {
    setPending(true);
    setError("");
    try {
      await createButtonAction(showId, formData);
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add button.");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdate(buttonId: string, formData: FormData) {
    setPending(true);
    setError("");
    try {
      await updateButtonAction(showId, buttonId, formData);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save button.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(buttonId: string, label: string) {
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    setBusyId(buttonId);
    setError("");
    try {
      await deleteButtonAction(showId, buttonId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete button.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = buttons.findIndex((b) => b.id === active.id);
    const newIndex = buttons.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(buttons, oldIndex, newIndex);
    setButtons(reordered);
    setError("");
    try {
      await reorderButtonsAction(
        showId,
        reordered.map((b) => b.id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save new order.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      {!hasSegmentButton && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
          Add a <strong>segment</strong> button (e.g. &quot;Intro&quot;, &quot;Main Topic&quot;) so you can
          export YouTube chapters from this show.
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={buttons.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {buttons.map((button) => (
              <SortableButtonRow
                key={button.id}
                button={button}
                editing={editingId === button.id}
                pending={pending}
                busy={busyId === button.id}
                onEdit={() => {
                  setIsAdding(false);
                  setEditingId(button.id);
                }}
                onDelete={() => handleDelete(button.id, button.label)}
                onUpdate={(formData) => handleUpdate(button.id, formData)}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {isAdding ? (
        <ButtonForm
          pending={pending}
          onSubmit={handleCreate}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          onClick={() => {
            setEditingId(null);
            setIsAdding(true);
          }}
          className="rounded-lg border border-dashed border-neutral-700 px-4 py-4 text-base text-neutral-300 transition-colors hover:border-neutral-500 hover:text-foreground"
        >
          + Add button
        </button>
      )}
    </div>
  );
}
