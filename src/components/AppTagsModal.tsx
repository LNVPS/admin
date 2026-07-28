import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useEffect, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminAppTagInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface AppTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: AdminAppTagInfo[];
  /** Reload the vocabulary (and anything rendering it) after a mutation. */
  onChanged: () => void;
}

interface TagDraft {
  /** Absent while creating. */
  id?: number;
  slug: string;
  display_name: string;
  description: string;
}

const EMPTY_DRAFT: TagDraft = { slug: "", display_name: "", description: "" };

/**
 * Manage the app tag vocabulary: list with per-tag app counts, create, rename
 * and delete.
 *
 * The vocabulary is controlled server-side — assigning an unknown slug to an
 * app is a `400`, never an implicit create — so this is the only place a tag
 * comes into existence.
 */
export function AppTagsModal({ isOpen, onClose, tags, onChanged }: AppTagsModalProps) {
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const { hasPermission } = useUserRoles();
  const [draft, setDraft] = useState<TagDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = hasPermission("app::create");
  const canUpdate = hasPermission("app::update");
  const canDelete = hasPermission("app::delete");

  useEffect(() => {
    if (!isOpen) {
      setDraft(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      if (draft.id === undefined) {
        await adminApi.createAppTag({
          slug: draft.slug.trim(),
          display_name: draft.display_name.trim(),
          description: draft.description.trim() || undefined,
        });
        success("Tag created");
      } else {
        await adminApi.updateAppTag(draft.id, {
          slug: draft.slug.trim(),
          display_name: draft.display_name.trim(),
          // Explicit null clears; the column is nullable and blank means "none".
          description: draft.description.trim() || null,
        });
        success("Tag updated");
      }
      setDraft(null);
      onChanged();
    } catch (err) {
      console.error("Failed to save tag:", err);
      const msg = err instanceof Error ? err.message : "Failed to save tag";
      setError(msg);
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: AdminAppTagInfo) => {
    // The cascade is invisible otherwise, so the count goes in the confirm
    // rather than being reported once it is too late to reconsider.
    const usage =
      tag.app_count > 0
        ? `It is currently on ${tag.app_count} enabled app(s); deleting it removes those assignments.`
        : "No enabled app currently carries it.";
    if (
      !(await confirmDialog({
        title: "Delete Tag",
        message: `Delete the tag "${tag.display_name}" (${tag.slug})?\n\n${usage}\n\nAny /apps/tag/${tag.slug} link already indexed will 404.`,
        confirmText: "Delete",
        variant: "danger",
      }))
    )
      return;
    try {
      const res = await adminApi.deleteAppTag(tag.id);
      success(res.assignments_removed > 0 ? `Tag deleted — untagged ${res.assignments_removed} app(s)` : "Tag deleted");
      onChanged();
    } catch (err) {
      console.error("Failed to delete tag:", err);
      toastError(err instanceof Error ? err.message : "Failed to delete tag");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage App Tags" size="2xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          The coarse grouping axis for the catalog, and a controlled vocabulary: an app can only carry a tag that exists
          here. Counts are of <span className="text-gray-300">enabled</span> apps, matching what a visitor sees.
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="overflow-x-auto rounded border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400">
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Display name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Apps</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No tags defined yet.
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id} className="border-t border-slate-800">
                    <td className="px-3 py-2 font-mono text-xs text-gray-300">{tag.slug}</td>
                    <td className="px-3 py-2 text-white">{tag.display_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{tag.description ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{tag.app_count}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="p-1"
                            title="Edit tag"
                            onClick={() =>
                              setDraft({
                                id: tag.id,
                                slug: tag.slug,
                                display_name: tag.display_name,
                                description: tag.description ?? "",
                              })
                            }
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Delete tag"
                            onClick={() => handleDelete(tag)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {draft ? (
          <form onSubmit={handleSubmit} className="space-y-3 rounded border border-slate-700 p-3">
            <h4 className="text-xs font-medium text-white">{draft.id === undefined ? "New tag" : "Edit tag"}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="app-tag-slug" className="block text-xs font-medium text-white mb-2">
                  Slug *
                </label>
                <input
                  id="app-tag-slug"
                  type="text"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="font-mono"
                  placeholder="media-server"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Lowercase letters, digits and hyphens only"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL-safe; it is a path segment in <span className="font-mono">/apps/tag/&#123;slug&#125;</span>.
                  Renaming breaks links already indexed.
                </p>
              </div>
              <div>
                <label htmlFor="app-tag-display-name" className="block text-xs font-medium text-white mb-2">
                  Display name *
                </label>
                <input
                  id="app-tag-display-name"
                  type="text"
                  value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  placeholder="Media server"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Typed, not derived — title-casing a slug mangles <span className="font-mono">NIP-96</span>.
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="app-tag-description" className="block text-xs font-medium text-white mb-2">
                Description
              </label>
              <input
                id="app-tag-description"
                type="text"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Lede shown on the tag landing page"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : draft.id === undefined ? "Create tag" : "Save tag"}
              </Button>
            </div>
          </form>
        ) : (
          canCreate && (
            <Button variant="secondary" size="sm" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New tag
            </Button>
          )
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
