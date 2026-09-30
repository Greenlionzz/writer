"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, KeyRound, Lock, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Button, ConfirmDialog, EmptyState, Input, Select } from "@/components/ui";
import { PROVIDERS, providerName } from "@/lib/providers";
import { fmt, timeAgo } from "@/lib/utils";

export type KeyMeta = {
  id: string;
  provider: string;
  label: string;
  model: string;
  last4: string;
  createdAt: string;
};

const PROVIDER_DOT: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97757",
  google: "#4795f6",
};

export function SettingsClient({ initialKeys }: { initialKeys: KeyMeta[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [provider, setProvider] = useState<string>("openai");
  const [label, setLabel] = useState("");
  const [model, setModel] = useState(PROVIDERS[0].defaultModel as string);
  const [keyValue, setKeyValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<KeyMeta | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const current = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  function pickProvider(id: string) {
    setProvider(id);
    const p = PROVIDERS.find((x) => x.id === id);
    if (p) setModel(p.defaultModel);
  }

  async function addKey(e: React.FormEvent) {
    e.preventDefault();
    if (keyValue.trim().length < 8) {
      toast.error("That API key looks too short.");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ key: KeyMeta }>("/api/keys", {
        method: "POST",
        body: { provider, label: label.trim(), model: model.trim(), key: keyValue.trim() },
      });
      setKeys((ks) => [{ ...res.key, createdAt: new Date().toISOString() }, ...ks]);
      setKeyValue("");
      setLabel("");
      toast.success(`${providerName(provider)} key added and encrypted with AES-256-GCM.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add the key.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const prev = keys;
    setKeys((ks) => ks.filter((k) => k.id !== deleting.id));
    try {
      await api(`/api/keys/${deleting.id}`, { method: "DELETE" });
      toast.success("Key removed.");
      setDeleting(null);
      router.refresh();
    } catch {
      setKeys(prev);
      toast.error("Could not delete the key.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <p className="text-xs font-semibold tracking-[0.2em] text-brass uppercase">Settings</p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
        Keys to the kingdom
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-faded">
        Fabula is bring-your-own-key: story generation runs through your own OpenAI,
        Anthropic or Google account. Keys are sealed with AES-256-GCM before they
        ever touch the database.
      </p>

      {/* Workspace */}
      <section className="grain mt-8 flex items-center gap-4 rounded-2xl border border-hairline bg-card/70 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
        </div>
        <div>
          <p className="font-medium text-cream">Local workspace</p>
          <p className="text-[13px] text-faded">
            No account, no sign-up — your stories, keys and codex live on this instance.
          </p>
        </div>
        <div className="ml-auto hidden items-center gap-1.5 text-[11px] font-medium text-emerald-300 sm:flex">
          <ShieldCheck className="h-4 w-4" />
          Ready to write
        </div>
      </section>

      {/* Add key */}
      <section className="grain mt-5 rounded-2xl border border-hairline bg-card/70 p-6">
        <div className="flex items-center gap-2.5">
          <KeyRound className="h-4.5 w-4.5 text-brass" />
          <h2 className="font-display text-lg font-semibold text-cream">Add an AI provider key</h2>
        </div>
        <form onSubmit={addKey} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Provider" value={provider} onChange={(e) => pickProvider(e.target.value)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              label="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={current.id === "openai" ? "e.g. OpenAI key" : `e.g. ${current.name} key`}
              maxLength={60}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="API key"
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={current.placeholder}
              autoComplete="off"
              required
            />
            <Input
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              hint={current.models}
              required
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              Encrypted at rest · only ever used server-side · shown once
            </p>
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Seal & save key
            </Button>
          </div>
        </form>
      </section>

      {/* Key list */}
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-faded uppercase">
            Sealed keys ({keys.length})
          </h2>
        </div>
        {keys.length === 0 ? (
          <EmptyState
            icon={<Bot className="h-6 w-6" />}
            title="No providers connected"
            description="Add an API key above and your story map will spring to life — premise to acts, acts to chapters, chapters to scenes."
          />
        ) : (
          <ul className="space-y-2.5">
            {keys.map((k) => (
              <li
                key={k.id}
                className="grain group flex items-center gap-4 rounded-xl border border-hairline bg-card/70 px-5 py-4"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: PROVIDER_DOT[k.provider] ?? "#d2a35c" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-cream">
                    {k.label}
                    <span className="rounded-full border border-hairline bg-lift px-2 py-px text-[10.5px] font-normal text-faded">
                      {providerName(k.provider)} · {k.model}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-stone-500">
                    ••••••••{k.last4} · sealed {timeAgo(k.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setDeleting(k)}
                  className="rounded-md p-2 text-stone-500 transition-colors hover:bg-red-950/60 hover:text-red-300"
                  title="Delete key"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {keys.length > 0 && (
          <p className="mt-4 flex items-center gap-1.5 px-1 text-[11px] text-stone-500">
            <Sparkles className="h-3.5 w-3.5 text-brass" />
            Generation uses your most recently added key — {fmt(keys.length)}{" "}
            {keys.length === 1 ? "key" : "keys"} sealed.
          </p>
        )}
      </section>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title={`Remove “${deleting?.label}”?`}
        message="The encrypted key is destroyed. Story generation will fall back to your next most recent key."
        confirmLabel="Remove key"
      />
    </div>
  );
}
