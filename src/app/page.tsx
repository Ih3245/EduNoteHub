"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import {
  Archive,
  ArrowDownToLine,
  FileImage,
  FileText,
  Files,
  FolderOpen,
  HardDriveUpload,
  Image as ImageIcon,
  Loader2,
  Search,
  Settings,
  X,
  CloudUpload,
} from "lucide-react";

type NoteItem = {
  id: string;
  file_name: string;
  file_type: "folder" | "file" | "image" | "zip";
  file_size: string;
  created_at: string;
  telegram_file_id: string;
};

type FileWithPath = File & { path?: string; webkitRelativePath?: string };
type FileFilter = "all" | "documents" | "images" | "archives";

const FILTERS: { id: FileFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "documents", label: "Docs" },
  { id: "images", label: "Images" },
  { id: "archives", label: "Archives" },
];

export default function Home() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FileFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/notes")
      .then((r) => r.json())
      .then((d) => { if (mounted && d.success) setNotes(d.notes); })
      .catch(console.error)
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const uploadFile = useCallback(async (file: File, pendingLabel = "Uploading...", prepare?: () => Promise<File>) => {
    const tempId = Math.random().toString();
    const isImage = file.type.includes("image");
    const isZip = /\.(zip|rar|7z)$/i.test(file.name);
    setNotes((prev) => [{
      id: tempId, file_name: file.name,
      file_type: isImage ? "image" : isZip ? "zip" : "file",
      file_size: pendingLabel, created_at: new Date().toISOString(), telegram_file_id: "temp",
    }, ...prev]);

    try {
      const fileToUpload = prepare ? await prepare() : file;
      setNotes((prev) => prev.map((n) => n.id === tempId ? { ...n, file_size: "Uploading..." } : n));
      const form = new FormData();
      form.append("file", fileToUpload);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        setNotes((prev) => prev.map((n) => n.id === tempId ? data.note : n));
      } else {
        alert(`Failed: ${data.error}`);
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
      }
    } catch (err) {
      alert(`Could not upload ${file.name}`);
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
    }
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    const folders = new Map<string, { file: File; path: string }[]>();
    for (const file of files) {
      const f = file as FileWithPath;
      const raw = f.webkitRelativePath || f.path || "";
      const parts = raw.replace(/\\/g, "/").replace(/^\.\?\//, "").replace(/^\/+/, "").split("/").filter(Boolean);
      if (parts.length < 2) { await uploadFile(file); continue; }
      const folder = parts[0];
      const arr = folders.get(folder) ?? [];
      arr.push({ file, path: parts.slice(1).join("/") });
      folders.set(folder, arr);
    }
    for (const [name, items] of folders) {
      await uploadFile(
        new File([], `${name}.zip`, { type: "application/zip" }),
        "Compressing...",
        async () => {
          const zip = new JSZip();
          for (const { file, path } of items) zip.file(`${name}/${path}`, file);
          const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
          return new File([blob], `${name}.zip`, { type: "application/zip" });
        }
      );
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((files: File[]) => uploadFiles(files), [uploadFiles]),
  });

  const counts = {
    all: notes.length,
    documents: notes.filter((n) => n.file_type === "file" || n.file_type === "folder").length,
    images: notes.filter((n) => n.file_type === "image").length,
    archives: notes.filter((n) => n.file_type === "zip").length,
  };

  const filtered = notes.filter((n) => {
    const matchSearch = n.file_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "all" ||
      (activeFilter === "documents" && (n.file_type === "file" || n.file_type === "folder")) ||
      (activeFilter === "images" && n.file_type === "image") ||
      (activeFilter === "archives" && n.file_type === "zip");
    return matchSearch && matchFilter;
  });

  const getIcon = (type: NoteItem["file_type"]) => {
    if (type === "image") return <ImageIcon size={20} strokeWidth={1.8} />;
    if (type === "zip") return <Archive size={20} strokeWidth={1.8} />;
    if (type === "folder") return <FolderOpen size={20} strokeWidth={1.8} />;
    return <FileText size={20} strokeWidth={1.8} />;
  };

  const isPending = (size: string) => size === "Uploading..." || size === "Compressing...";

  return (
    <div style={{ minHeight: "100vh", background: "var(--page)", fontFamily: "var(--font-sans)" }}>
      {/* ── TOP NAV ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--surface)", borderBottom: "1px solid var(--line)",
        padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          {!showSearch && (
            <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.3px" }}>
              Edu<span style={{ color: "var(--blue)" }}>Note</span>
            </span>
          )}
        </div>

        {/* Search bar (expandable) */}
        {showSearch ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--surface-muted)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", height: 38 }}>
            <Search size={16} style={{ color: "var(--text-soft)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: 15, color: "var(--text)" }}
            />
            <button onClick={() => { setShowSearch(false); setSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-soft)", padding: 0, display: "flex" }}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowSearch(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-soft)", padding: 8, display: "flex" }}>
            <Search size={20} />
          </button>
        )}

        {/* Settings */}
        <a href="/settings" style={{ color: "var(--text-soft)", padding: 8, display: "flex" }} title="Settings">
          <Settings size={20} />
        </a>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 80px" }}>
        {/* ── UPLOAD ZONE ── */}
        <section
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? "var(--blue)" : "var(--line-strong)"}`,
            borderRadius: 16,
            background: isDragActive ? "var(--blue-tint)" : "var(--surface)",
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 24,
            transition: "all 0.2s",
          }}
        >
          <input {...getInputProps()} />
          <input ref={folderInputRef} className="sr-only" type="file" multiple
            onChange={(e) => { const files = Array.from(e.currentTarget.files ?? []); void uploadFiles(files); e.currentTarget.value = ""; }}
          />
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "var(--blue)" }}>
            <CloudUpload size={24} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", margin: "0 0 4px" }}>
            {isDragActive ? "Drop files here" : "Tap to upload files"}
          </p>
          <p style={{ fontSize: 14, color: "var(--text-soft)", margin: 0 }}>
            Drag & drop or click — folders become ZIP archives
          </p>
        </section>

        {/* ── FILTER TABS ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                flexShrink: 0, padding: "7px 16px", borderRadius: 100, fontSize: 14, fontWeight: 600, border: "none",
                cursor: "pointer", transition: "all 0.15s",
                background: activeFilter === f.id ? "var(--blue)" : "var(--surface)",
                color: activeFilter === f.id ? "#fff" : "var(--text-soft)",
                boxShadow: activeFilter === f.id ? "none" : "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px var(--line)",
              }}
            >
              {f.label} <span style={{ opacity: 0.75 }}>{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {/* ── FILE LIST ── */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12, color: "var(--text-soft)" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 15 }}>Loading files...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-soft)" }}>
            <Files size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontWeight: 600, fontSize: 17, color: "var(--text)", margin: "0 0 6px" }}>
              {search ? "No files found" : "Your library is empty"}
            </p>
            <p style={{ fontSize: 14, margin: 0 }}>
              {search ? "Try a different search term." : "Upload your first file above."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((note) => (
              <a
                key={note.id}
                href={!isPending(note.file_size) ? `/api/download?id=${note.telegram_file_id}&name=${encodeURIComponent(note.file_name)}` : undefined}
                download={!isPending(note.file_size) ? note.file_name : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--surface)", borderRadius: 14,
                  padding: "14px 16px", border: "1px solid var(--line)",
                  textDecoration: "none", cursor: isPending(note.file_size) ? "default" : "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => { if (!isPending(note.file_size)) { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--blue)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 3px var(--blue-light)"; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
              >
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: note.file_type === "image" ? "#fff7ed" : note.file_type === "zip" ? "#f5f3ff" : "var(--blue-light)",
                  color: note.file_type === "image" ? "var(--orange)" : note.file_type === "zip" ? "var(--purple)" : "var(--blue)",
                }}>
                  {isPending(note.file_size) ? <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> : getIcon(note.file_type)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.file_name}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                    {isPending(note.file_size) ? note.file_size : `${note.file_size} · ${new Date(note.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>

                {/* Download icon (visual only) */}
                {!isPending(note.file_size) && (
                  <span style={{ color: "var(--text-soft)", padding: 8, display: "flex", flexShrink: 0 }}>
                    <ArrowDownToLine size={20} />
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
      `}</style>
    </div>
  );
}
