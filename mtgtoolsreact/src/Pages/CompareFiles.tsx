import { useRef, useState } from "react";
import { apiPaths } from "../Utilities/Enums";
import { CallApiWithFile, startTimer } from "../Utilities/CustomFunctions";
import { motion } from "motion/react";
import { FileDiff, Upload, Loader2, ArrowRightLeft } from "lucide-react";
import { cn } from "../lib/utils";

export default function CompareFiles() {
    const [isLoading, setIsLoading] = useState(false);
    const firstDeck = useRef<HTMLInputElement>(null);
    const secondDeck = useRef<HTMLInputElement>(null);
    const [filesSelected, setFilesSelected] = useState<{first?: string, second?: string}>({});

    async function compareFiles() {
        if (!firstDeck.current?.files || firstDeck.current?.files.length === 0) {
            alert("Please select the first file to compare");
        } else if (!secondDeck.current?.files || secondDeck.current?.files.length === 0) {
            alert("Please select the second file to compare");
        } else {
            startTimer();
            setIsLoading(true);
            try {
                const files = [firstDeck.current.files[0], secondDeck.current.files[0]];
                await CallApiWithFile(files, apiPaths.CompareFiles, 'DeckDifferences.txt');
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
                    <FileDiff className="text-purple-400" size={40} />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase">Compare Decks</h2>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto italic">
                        "Find every single difference."
                    </p>
                </div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass rounded-[2rem] p-8 md:p-12 border border-purple-500/20 shadow-2xl space-y-8"
            >
                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-6">
                    {/* First File */}
                    <div className="relative group">
                        <input
                            ref={firstDeck}
                            type="file"
                            accept=".xml,.dek,.txt"
                            onChange={(e) => setFilesSelected(prev => ({...prev, first: e.target.files?.[0]?.name}))}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className={cn(
                            "p-8 rounded-2xl border-2 border-dashed transition-all duration-300 text-center space-y-3",
                            filesSelected.first ? "border-purple-500 bg-purple-500/5" : "border-purple-500/20 hover:border-purple-500/40"
                        )}>
                            <Upload className="mx-auto text-purple-400/60" size={24} />
                            <p className="text-sm font-medium text-slate-300 truncate px-2">
                                {filesSelected.first || "Select First Deck"}
                            </p>
                        </div>
                    </div>

                    <ArrowRightLeft className="text-purple-500/40 hidden md:block" size={24} />

                    {/* Second File */}
                    <div className="relative group">
                        <input
                            ref={secondDeck}
                            type="file"
                            accept=".xml,.dek,.txt"
                            onChange={(e) => setFilesSelected(prev => ({...prev, second: e.target.files?.[0]?.name}))}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className={cn(
                            "p-8 rounded-2xl border-2 border-dashed transition-all duration-300 text-center space-y-3",
                            filesSelected.second ? "border-purple-500 bg-purple-500/5" : "border-purple-500/20 hover:border-purple-500/40"
                        )}>
                            <Upload className="mx-auto text-purple-400/60" size={24} />
                            <p className="text-sm font-medium text-slate-300 truncate px-2">
                                {filesSelected.second || "Select Second Deck"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button 
                        onClick={compareFiles}
                        disabled={isLoading || !filesSelected.first || !filesSelected.second}
                        className="group flex items-center gap-3 px-10 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-purple-500/20 active:scale-95"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <FileDiff size={20} />}
                        Compare Files
                    </button>
                </div>

                <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                    <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
                        Accepted formats: .xml, .dek, .txt
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
