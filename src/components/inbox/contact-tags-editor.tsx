"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContactTagsEditorProps {
  contactId: string;
}

export function ContactTagsEditor({ contactId }: ContactTagsEditorProps) {
  const supabase = createClient();
  const { user } = useAuth();

  const [tags, setTags] = useState<Tag[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingTagId, setSavingTagId] = useState<string | null>(null);

  async function loadTags() {
    if (!user?.id || !contactId) return;

    try {
      setLoading(true);

      const [tagsRes, contactTagsRes] = await Promise.all([
        supabase
          .from("tags")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("contact_tags")
          .select("tag_id")
          .eq("contact_id", contactId),
      ]);

      if (tagsRes.error) throw tagsRes.error;
      if (contactTagsRes.error) throw contactTagsRes.error;

      setTags(tagsRes.data || []);
      setAssignedTagIds(
        new Set((contactTagsRes.data || []).map((row) => row.tag_id)),
      );
    } catch (err) {
      console.error("Failed to load contact tags:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, contactId]);

  const assignedTags = useMemo(() => {
    return tags.filter((tag) => assignedTagIds.has(tag.id));
  }, [tags, assignedTagIds]);

  const availableTags = useMemo(() => {
    return tags.filter((tag) => !assignedTagIds.has(tag.id));
  }, [tags, assignedTagIds]);

  async function addTag(tag: Tag) {
    try {
      setSavingTagId(tag.id);

      const { error } = await supabase.from("contact_tags").insert({
        contact_id: contactId,
        tag_id: tag.id,
      });

      if (error && error.code !== "23505") throw error;

      setAssignedTagIds((prev) => {
        const next = new Set(prev);
        next.add(tag.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to add tag:", err);
    } finally {
      setSavingTagId(null);
    }
  }

  async function removeTag(tag: Tag) {
    try {
      setSavingTagId(tag.id);

      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("contact_id", contactId)
        .eq("tag_id", tag.id);

      if (error) throw error;

      setAssignedTagIds((prev) => {
        const next = new Set(prev);
        next.delete(tag.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to remove tag:", err);
    } finally {
      setSavingTagId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading tags...
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {assignedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
            border: `1px solid ${tag.color}40`,
          }}
        >
          {tag.name}

          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={savingTagId === tag.id}
            className="rounded-full p-0.5 opacity-70 hover:bg-black/10 hover:opacity-100"
            title={`Remove ${tag.name}`}
          >
            {savingTagId === tag.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </button>
        </span>
      ))}

      {assignedTags.length === 0 && (
        <span className="text-sm text-muted-foreground">No tags</span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border border-border px-2 text-xs",
            "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Plus className="h-3 w-3" />
          Add
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="border-border bg-popover">
          {availableTags.length === 0 ? (
            <DropdownMenuItem disabled className="text-sm">
              No tags available
            </DropdownMenuItem>
          ) : (
            availableTags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => addTag(tag)}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}