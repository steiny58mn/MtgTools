import { type ChangeEvent, useState } from "react";
import { apiPaths } from "../Utilities/Enums";
import { motion } from "motion/react";
import { Database, Upload, FileCode, Loader2, RefreshCcw, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function UpdateCardsDbFromJsonFile() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files && event.target.files.length > 0) {
            setIsLoading(true);
            setStatus({ type: 'idle', message: '' });
            
            const startTime = Date.now();
            const selectedFile = event.target.files[0];
            const formData = new FormData();
            formData.append("file", selectedFile, selectedFile.name);

            try {
                const res = await fetch(apiPaths.UpdateDb, {
                    method: "POST",
                    body: formData,
                });
                
                if (res.ok) {
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                    setStatus({ 
                        type: 'success', 
                        message: `Database successfully synchronized in ${duration}s.` 
                    });
                } else {
                    const errorText = await res.text();
                    setStatus({ type: 'error', message: `Sync failed: ${errorText}` });
                }
            } catch (err) {
                setStatus({ type: 'error', message: "Network error during database synchronization." });
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
    }

    return (
        <div className="space-y-8 p-4">
            <div className="text-center space-y-4">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-purple-500/20"
                >
                    <Database className="text-purple-400" size={40} />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase">Sync Database</h2>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto italic">
                        "Keep your card records synchronized."
                    </p>
                </div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass rounded-[2rem] p-8 md:p-12 border border-purple-500/20 shadow-2xl space-y-8"
            >
                <div className="relative group cursor-pointer border-2 border-dashed border-purple-500/20 hover:border-purple-500/40 rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-slate-950/20 overflow-hidden">
                    <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        accept=".json"
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
                            {isLoading ? "Updating Records..." : "Upload Cards JSON"}
                        </p>
                        <p className="text-slate-400 text-sm">
                            select the scryfall bulk data file
                        </p>
                    </div>

                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/10 text-xs text-slate-400">
                            <FileCode size={14} /> card_data.json
                        </div>
                    </div>
                </div>

                {status.type !== 'idle' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "p-6 rounded-2xl border flex items-start gap-4 shadow-lg",
                            status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}
                    >
                        {status.type === 'success' ? <CheckCircle2 className="shrink-0" size={20} /> : <RefreshCcw className="shrink-0" size={20} />}
                        <div>
                            <p className="font-bold uppercase tracking-widest text-[10px] mb-1">
                                {status.type === 'success' ? "Success" : "Sync Failed"}
                            </p>
                            <p className="text-sm font-medium">{status.message}</p>
                        </div>
                    </motion.div>
                )}

                <div className="p-6 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                    <p className="text-xs text-slate-400 leading-relaxed text-center italic">
                        This tool processes large Scryfall JSON datasets to synchronize the internal card registry with the latest Oracle data.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
