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
  Folder,
  FolderOpen,
  HardDriveUpload,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
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

const filters: { id: FileFilter; label: string }[] = [
  { id: "all", label: "All files" },
  { id: "documents", label: "Documents" },
  { id: "images", label: "Images" },
  { id: "archives", label: "Archives" },
];

export default function Home() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FileFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/notes")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setNotes(data.notes);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch notes", error);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    pendingLabel = "Uploading...",
    prepareFile?: () => Promise<File>,
  ) => {
      const tempId = Math.random().toString();
      const newFile: NoteItem = {
        id: tempId,
        file_name: file.name,
        file_type: file.type.includes("image")
          ? "image"
          : /\.(zip|rar|7z)$/i.test(file.name)
            ? "zip"
            : "file",
        file_size: pendingLabel,
        created_at: new Date().toISOString(),
        telegram_file_id: "temp",
      };

      setNotes((prev) => [newFile, ...prev]);

      const formData = new FormData();

      try {
        const fileToUpload = prepareFile ? await prepareFile() : file;
        setNotes((prev) =>
          prev.map((note) =>
            note.id === tempId ? { ...note, file_size: "Uploading..." } : note,
          ),
        );
        formData.append("file", fileToUpload);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          setNotes((prev) =>
            prev.map((note) => (note.id === tempId ? data.note : note)),
          );
        } else {
          alert(`Failed: ${data.error}`);
          setNotes((prev) => prev.filter((note) => note.id !== tempId));
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}`, error);
        alert(`Could not prepare or upload ${file.name}`);
        setNotes((prev) => prev.filter((note) => note.id !== tempId));
      }
  }, []);

  const uploadFiles = useCallback(async (acceptedFiles: File[]) => {
    const folders = new Map<string, { file: File; path: string }[]>();

    for (const file of acceptedFiles) {
      const fileWithPath = file as FileWithPath;
      const rawPath =
        fileWithPath.webkitRelativePath || fileWithPath.path || "";
      const normalizedPath = rawPath
        .replace(/\\/g, "/")
        .replace(/^\.?\//, "")
        .replace(/^\/+/, "");
      const pathParts = normalizedPath.split("/").filter(Boolean);

      if (pathParts.length < 2) {
        await uploadFile(file);
        continue;
      }

      const folderName = pathParts[0];
      const folderFiles = folders.get(folderName) ?? [];
      folderFiles.push({ file, path: pathParts.slice(1).join("/") });
      folders.set(folderName, folderFiles);
    }

    for (const [folderName, folderFiles] of folders) {
      await uploadFile(
        new File([], `${folderName}.zip`, { type: "application/zip" }),
        "Compressing folder...",
        async () => {
          const zip = new JSZip();
          for (const { file, path } of folderFiles) {
            zip.file(`${folderName}/${path}`, file);
          }

          const archive = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
          });
          return new File([archive], `${folderName}.zip`, {
            type: "application/zip",
          });
        },
      );
    }
  }, [uploadFile]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => uploadFiles(acceptedFiles),
    [uploadFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
  });

  const getIcon = (type: NoteItem["file_type"]) => {
    switch (type) {
      case "folder":
        return <Folder size={19} strokeWidth={1.8} />;
      case "image":
        return <ImageIcon size={19} strokeWidth={1.8} />;
      case "zip":
        return <Archive size={19} strokeWidth={1.8} />;
      default:
        return <FileText size={19} strokeWidth={1.8} />;
    }
  };

  const getTypeLabel = (type: NoteItem["file_type"]) => {
    switch (type) {
      case "folder":
        return "Folder";
      case "image":
        return "Image";
      case "zip":
        return "Archive";
      default:
        return "Document";
    }
  };

  const counts = {
    all: notes.length,
    documents: notes.filter(
      (note) => note.file_type === "file" || note.file_type === "folder",
    ).length,
    images: notes.filter((note) => note.file_type === "image").length,
    archives: notes.filter((note) => note.file_type === "zip").length,
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.file_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "documents" &&
        (note.file_type === "file" || note.file_type === "folder")) ||
      (activeFilter === "images" && note.file_type === "image") ||
      (activeFilter === "archives" && note.file_type === "zip");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="file-manager">
      <aside className="manager-sidebar" aria-label="File manager navigation">
        <a className="manager-brand" href="#top" aria-label="EduNote home">
          <span className="brand-icon">
            <Files size={21} strokeWidth={2} />
          </span>
          <span className="brand-name">
            Edu<span>Note</span>
            <small>ACADEMIC FILES</small>
          </span>
        </a>

        <div className="sidebar-section">
          <p className="sidebar-heading">WORKSPACE</p>
          <nav className="sidebar-nav">
            {filters.map((filter) => (
              <button
                className={`sidebar-nav-item${activeFilter === filter.id ? " is-active" : ""}`}
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                aria-current={activeFilter === filter.id ? "page" : undefined}
              >
                {filter.id === "all" && <Files size={18} />}
                {filter.id === "documents" && <FileText size={18} />}
                {filter.id === "images" && <FileImage size={18} />}
                {filter.id === "archives" && <Archive size={18} />}
                <span>{filter.label}</span>
                <span className="sidebar-count">{counts[filter.id]}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-upload">
          <div className="sidebar-upload-icon">
            <HardDriveUpload size={19} />
          </div>
          <p>Keep your study materials together.</p>
          <a href="#upload">Upload a file</a>
        </div>

        <div className="sidebar-footer">
          <span className="connection-dot" />
          Your personal study space
        </div>
      </aside>

      <main className="manager-main" id="top">
        <header className="manager-topbar">
          <div className="topbar-label">
            <span className="topbar-overline">EDUNOTE</span>
            <span className="topbar-separator">/</span>
            <span>My workspace</span>
          </div>
          <label className="manager-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search files</span>
            <input
              type="search"
              placeholder="Search files..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                className="search-reset"
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>
        </header>

        <div className="manager-content">
          <section className="page-heading">
            <div>
              <p className="page-eyebrow">PERSONAL ACADEMIC ARCHIVE</p>
              <h1>My library</h1>
              <p className="page-description">
                Manage your notes, documents, and study materials.
              </p>
            </div>
            <a className="primary-action" href="#upload">
              <HardDriveUpload size={17} />
              Upload files
            </a>
          </section>

          <section className="overview-grid" aria-label="File totals">
            <article className="overview-card overview-card-total">
              <span className="overview-icon"><Files size={18} /></span>
              <span className="overview-copy">
                <span className="overview-label">ALL FILES</span>
                <strong>{counts.all}</strong>
              </span>
              <span className="overview-detail">in your library</span>
            </article>
            <article className="overview-card">
              <span className="overview-icon overview-icon-doc"><FileText size={18} /></span>
              <span className="overview-copy">
                <span className="overview-label">DOCUMENTS</span>
                <strong>{counts.documents}</strong>
              </span>
              <span className="overview-detail">notes &amp; files</span>
            </article>
            <article className="overview-card">
              <span className="overview-icon overview-icon-image"><ImageIcon size={18} /></span>
              <span className="overview-copy">
                <span className="overview-label">IMAGES</span>
                <strong>{counts.images}</strong>
              </span>
              <span className="overview-detail">visual references</span>
            </article>
            <article className="overview-card">
              <span className="overview-icon overview-icon-archive"><Archive size={18} /></span>
              <span className="overview-copy">
                <span className="overview-label">ARCHIVES</span>
                <strong>{counts.archives}</strong>
              </span>
              <span className="overview-detail">compressed files</span>
            </article>
          </section>

          <section
            {...getRootProps()}
            className={`upload-panel${isDragActive ? " upload-panel-active" : ""}`}
            id="upload"
            aria-label="Upload notes and files"
          >
            <input {...getInputProps()} />
            <input
              ref={folderInputRef}
              className="sr-only"
              type="file"
              multiple
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                void uploadFiles(files);
                event.currentTarget.value = "";
              }}
              aria-label="Choose a folder to upload"
            />
            <span className="upload-panel-icon">
              <HardDriveUpload size={21} strokeWidth={1.8} />
            </span>
            <span className="upload-panel-copy">
              <strong>{isDragActive ? "Drop files to upload" : "Upload study materials"}</strong>
              <span>Folder contents are bundled into one ZIP archive</span>
            </span>
            <span className="upload-supported">
              <span>SUPPORTED</span>
              <strong>Documents, images, files &amp; ZIP archives</strong>
            </span>
            <span className="upload-actions">
              <button
                className="upload-choice upload-choice-primary"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  open();
                }}
              >
                <HardDriveUpload size={15} />
                Choose files
              </button>
              <button
                className="upload-choice"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  folderInputRef.current?.click();
                }}
              >
                <FolderOpen size={15} />
                Choose folder
              </button>
            </span>
          </section>

          <section className="files-section" aria-labelledby="files-heading">
            <div className="files-toolbar">
              <div className="files-title">
                <h2 id="files-heading">
                  {filters.find((filter) => filter.id === activeFilter)?.label}
                </h2>
                <span>
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="filter-tabs" aria-label="Filter files">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-tab${activeFilter === filter.id ? " filter-tab-active" : ""}`}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    aria-pressed={activeFilter === filter.id}
                  >
                    {filter.label}
                    <span>{counts[filter.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="files-loading" role="status">
                <Loader2 className="spin" size={22} />
                <span>Loading your files...</span>
              </div>
            ) : filteredNotes.length > 0 ? (
              <div className="files-table-wrap">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th scope="col">NAME</th>
                      <th scope="col">TYPE</th>
                      <th scope="col">FILE SIZE</th>
                      <th scope="col">DATE ADDED</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotes.map((note) => (
                      <tr key={note.id}>
                        <td>
                          <div className="file-name-cell">
                            <span className={`file-type-icon file-type-${note.file_type}`}>
                              {note.file_size === "Uploading..." ||
                              note.file_size === "Compressing folder..." ? (
                                <Loader2 className="spin" size={18} />
                              ) : (
                                getIcon(note.file_type)
                              )}
                            </span>
                            <span className="file-name-text" title={note.file_name}>
                              <strong>{note.file_name}</strong>
                              {(note.file_size === "Uploading..." ||
                                note.file_size === "Compressing folder...") && (
                                <small>{note.file_size}</small>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="file-type-label">
                            {getTypeLabel(note.file_type)}
                          </span>
                        </td>
                        <td className="file-muted">
                          {note.file_size === "Uploading..." ||
                          note.file_size === "Compressing folder..."
                            ? "—"
                            : note.file_size}
                        </td>
                        <td className="file-muted">
                          {new Date(note.created_at).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="file-action-cell">
                          {note.file_size !== "Uploading..." &&
                            note.file_size !== "Compressing folder..." && (
                            <a
                              className="download-action"
                              href={`/api/download?id=${note.telegram_file_id}&name=${encodeURIComponent(note.file_name)}`}
                              title={`Download ${note.file_name}`}
                              aria-label={`Download ${note.file_name}`}
                              download
                            >
                              <ArrowDownToLine size={17} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="files-empty">
                <span className="empty-icon">
                  {search ? <Search size={22} /> : <Files size={22} />}
                </span>
                <h3>
                  {search
                    ? "No files found"
                    : activeFilter === "all"
                      ? "Your library is empty"
                      : `No ${filters.find((filter) => filter.id === activeFilter)?.label.toLowerCase()} yet`}
                </h3>
                <p>
                  {search
                    ? "Try a different search or clear the current filters."
                    : activeFilter === "all"
                      ? "Upload your first study material to get started."
                      : `There are no ${filters.find((filter) => filter.id === activeFilter)?.label.toLowerCase()} in your library yet.`}
                </p>
                {search ? (
                  <button
                    className="empty-action"
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setActiveFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  <a className="empty-action" href="#upload">Upload a file</a>
                )}
              </div>
            )}
          </section>

          <footer className="manager-footer">
            <span>EduNote · Personal academic archive</span>
            <span>Organized for learning</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
