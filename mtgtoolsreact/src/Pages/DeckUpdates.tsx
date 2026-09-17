import { useRef } from "react";
import ColorDropDown from "../Components/ColorDropDown.tsx";
import { ToolTypeCodes } from "../Utilities/Enums";
import { motion } from "motion/react";
import { Layout, Copy, Check } from "lucide-react";
import { useState } from "react";

function DeckUpdates() {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (textAreaRef.current) {
            textAreaRef.current.select();
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
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
                    <Layout className="text-purple-400" size={40} />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase">Deck Updates</h2>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto italic">
                        "Your progress, perfectly formatted."
                    </p>
                </div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass rounded-[2rem] p-8 md:p-12 border border-purple-500/20 shadow-2xl space-y-10"
            >
                <div className="flex flex-col items-center gap-4">
                    <ColorDropDown updateType={ToolTypeCodes.DeckUpdates} textAreaRef={textAreaRef}/>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Review Output</label>
                        <button 
                            onClick={handleCopy}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? "Copied!" : "Copy All"}
                        </button>
                    </div>
                    <textarea
                        id="DeckUpdatesTextArea"
                        ref={textAreaRef}
                        autoComplete="off"
                        className="w-full h-80 bg-slate-950/50 border border-purple-500/10 rounded-2xl p-8 text-slate-300 font-mono text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/40 outline-none transition-all resize-none shadow-inner leading-relaxed"
                        placeholder="Choose a color combination to begin..."
                    />
                </div>
                
                <p className="text-center text-xs text-slate-500 font-medium">
                    The output is optimized for MTGNexus forum posts.
                </p>
            </motion.div>
        </div>
    );
}

export default DeckUpdates;