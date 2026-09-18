import { useState } from 'react';
import type { ChangeEvent } from "react";
import { apiPaths } from "../Utilities/Enums";
import { CallApiWithFile, startTimer } from "../Utilities/CustomFunctions"
import { motion } from "motion/react";
import { FilePlus, Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function CreateDecklist() {
    const [isLoading, setIsLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    async function processFiles(files: File[]) {
        if (files.length > 0) {
            startTimer();
            setIsLoading(true);
            try {
                await CallApiWithFile(files, apiPaths.CreateDecklist, 'ReorganizedDecklist.txt');
            } finally {
                setIsLoading(false);
            }
        }
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files) {
            await processFiles(Array.from(event.target.files));
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            void processFiles(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <div className="space-y-8 p-4">
            <div className="text-center space-y-4">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-purple-500/20"
                >
                    <FilePlus className="text-purple-400" size={40} />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase text-balance">Create Deck List</h2>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto italic">
                        "Convert MTGO files to Nexus-ready text."
                    </p>
                </div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass rounded-[2rem] p-8 md:p-12 border border-purple-500/20 shadow-2xl space-y-8"
            >
                <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                        "relative group cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-slate-950/20",
                        dragActive ? "border-purple-500 bg-purple-500/10 scale-[1.02]" : "border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5",
                        isLoading && "pointer-events-none opacity-50"
                    )}
                >
                    <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept=".xml,.dek"
                        multiple
                        onChange={handleFileChange}
                        disabled={isLoading}
                    />
                    
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isLoading ? (
                            <Loader2 className="animate-spin text-purple-400" size={32} />
                        ) : (
                            <Upload className="text-purple-400" size={32} />
                        )}
                    </div>
                    
                    <div className="text-center">
                        <p className="text-lg font-bold text-slate-100">
                            {isLoading ? "Processing Deck..." : "Drop your .dek or .xml files here"}
                        </p>
                        <p className="text-slate-400 text-sm">
                            or click to browse your computer
                        </p>
                    </div>

                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/10 text-xs text-slate-400">
                            <FileText size={14} /> .dek
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/10 text-xs text-slate-400">
                            <FileText size={14} /> .xml
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-purple-500/5 rounded-2xl border border-purple-500/10 text-center">
                    <p className="text-xs text-slate-400 leading-relaxed">
                        This tool reorganizes your decklist and wraps it in <code className="text-purple-400 font-bold">[DECK]</code> tags automatically.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}