import { CheckCircleIcon, CommandLineIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminVmOsImageInfo } from "../lib/api";
import { DISTRIBUTION_LABELS, STANDARD_CLOUD_IMAGES, type StandardCloudImage } from "../lib/cloudImageCatalog";
import { Button } from "./Button";
import { Modal } from "./Modal";

// Normalize URLs so trivial differences (trailing slash, protocol case) don't hide matches
function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

function isAlreadyAdded(image: StandardCloudImage, existing: AdminVmOsImageInfo[]): boolean {
  return existing.some(
    (e) =>
      normalizeUrl(e.url) === normalizeUrl(image.url) ||
      (e.distribution === image.distribution && e.version === image.version),
  );
}

export function CloudImagePickerModal({
  isOpen,
  onClose,
  onSelect,
  onCustom,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: StandardCloudImage) => void;
  onCustom: () => void;
}) {
  const adminApi = useAdminApi();
  const [existing, setExisting] = useState<AdminVmOsImageInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load all existing images when the picker opens so we can exclude duplicates
  useEffect(() => {
    if (!isOpen) return;
    setExisting(null);
    setError(null);
    const loadExisting = async () => {
      try {
        const all: AdminVmOsImageInfo[] = [];
        let offset = 0;
        const limit = 100;
        for (;;) {
          const response = await adminApi.getVmOsImages({ limit, offset });
          all.push(...response.data);
          offset += response.data.length;
          if (response.data.length < limit || offset >= response.total) break;
        }
        setExisting(all);
      } catch (err) {
        console.error("Failed to load existing OS images:", err);
        setError("Failed to load existing OS images");
        setExisting([]);
      }
    };
    loadExisting();
  }, [isOpen, adminApi]);

  const available = useMemo(() => {
    if (existing === null) return [];
    return STANDARD_CLOUD_IMAGES.filter((image) => !isAlreadyAdded(image, existing));
  }, [existing]);

  const loading = existing === null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add OS Image" size="2xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Pick a standard cloud image to pre-fill the form, or add a custom image. Images already added are hidden.
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}

        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading existing images...</div>
        ) : available.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <CheckCircleIcon className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-70" />
            <p>All standard cloud images have already been added</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-700 rounded-lg border border-slate-700">
            {available.map((image) => (
              <button
                key={image.url}
                type="button"
                onClick={() => onSelect(image)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
              >
                <CommandLineIcon className="h-5 w-5 shrink-0 text-blue-400" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">
                    {DISTRIBUTION_LABELS[image.distribution]} {image.version}
                    <span className="ml-2 text-xs font-normal capitalize text-slate-400">{image.flavour}</span>
                    {image.note && (
                      <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-xs font-normal text-slate-300">
                        {image.note}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500" title={image.url}>
                    {image.url}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-400">user: {image.default_username}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="secondary" onClick={onCustom}>
            <PencilSquareIcon className="h-4 w-4 mr-2" />
            Custom Image
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
