"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Folder, File, Image as ImageIcon, FileArchive, UploadCloud, X, Search, BookOpen, Loader2 } from "lucide-react";

type NoteItem = {
  id: string;
  file_name: string;
  file_type: "folder" | "file" | "image" | "zip";
  file_size: string;
  created_at: string;
  telegram_file_id: string;
  color?: string;
};

const colors = ["bg-blue-200", "bg-pink-200", "bg-yellow-200", "bg-green-200"];

export default function Home() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.success) {
        // Assign random colors for UI
        const coloredNotes = data.notes.map((n: NoteItem) => ({
          ...n,
          color: colors[Math.floor(Math.random() * colors.length)]
        }));
        setNotes(coloredNotes);
      }
    } catch (error) {
      console.error("Failed to fetch notes");
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      // Add a temporary loading state item
      const tempId = Math.random().toString();
      const newFile: NoteItem = {
        id: tempId,
        file_name: file.name,
        file_type: (file.type.includes("image") ? "image" : file.name.endsWith(".zip") ? "zip" : "file"),
        file_size: "Uploading...",
        created_at: new Date().toISOString(),
        telegram_file_id: "temp",
        color: "bg-gray-200"
      };
      
      setNotes((prev) => [newFile, ...prev]);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        
        if (data.success) {
          // Replace temp item with real item
          const realNote = { ...data.note, color: colors[Math.floor(Math.random() * colors.length)] };
          setNotes((prev) => prev.map(n => n.id === tempId ? realNote : n));
        } else {
          alert(`Failed: ${data.error}`);
          setNotes((prev) => prev.filter(n => n.id !== tempId));
        }
      } catch (err) {
        alert(`Error uploading ${file.name}`);
        setNotes((prev) => prev.filter(n => n.id !== tempId));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const getIcon = (type: string) => {
    switch (type) {
      case "folder": return <Folder size={32} className="text-gray-800" />;
      case "image": return <ImageIcon size={32} className="text-gray-800" />;
      case "zip": return <FileArchive size={32} className="text-gray-800" />;
      default: return <File size={32} className="text-gray-800" />;
    }
  };

  const filteredNotes = notes.filter(f => f.file_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 neo-box bg-yellow-300 flex items-center justify-center">
            <BookOpen size={24} className="text-gray-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">EduNote Hub</h1>
            <p className="text-gray-700 font-medium text-sm">Your Personal Academic Archive</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search size={20} className="absolute left-3 top-3 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            className="w-full neo-box py-2 pl-10 pr-4 outline-none font-medium text-gray-800 focus:ring-2 focus:ring-blue-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <div 
            {...getRootProps()} 
            className={`neo-box p-8 border-dashed border-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px] transition-colors ${isDragActive ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-pink-200 rounded-full border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#1a1a1a]">
              <UploadCloud size={32} className="text-gray-900" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Files</h3>
            <p className="text-gray-600 font-medium text-sm">Drag & drop your notes, images, or zip folders here.</p>
            <p className="mt-6 text-xs font-bold text-gray-500 uppercase tracking-widest">NO PASSWORD NEEDED</p>
          </div>
        </div>

        {/* Files Grid */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-gray-900">Recent Notes</h2>
            <div className="flex gap-2">
              <button className="neo-button bg-white text-sm">All</button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-gray-500" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredNotes.map((note) => (
                <div key={note.id} className="neo-box p-5 flex items-start gap-4 relative group">
                  <div className={`w-14 h-14 ${note.color} rounded-xl border-2 border-gray-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#1a1a1a]`}>
                    {note.file_size === "Uploading..." ? <Loader2 className="animate-spin" size={24} /> : getIcon(note.file_type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-12">
                    <h4 className="font-bold text-gray-900 truncate text-lg" title={note.file_name}>{note.file_name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-gray-600">
                      <span>{note.file_size}</span>
                    </div>
                  </div>
                  {note.file_size !== "Uploading..." && (
                    <a 
                      href={`/api/download?id=${note.telegram_file_id}&name=${encodeURIComponent(note.file_name)}`}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-gray-900 hover:bg-blue-300 flex items-center justify-center transition-colors bg-white shadow-[2px_2px_0px_0px_#1a1a1a]"
                      title="Download File"
                      download
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                  )}
                </div>
              ))}
              
              {filteredNotes.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 font-bold">
                  No notes found. Upload some!
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
